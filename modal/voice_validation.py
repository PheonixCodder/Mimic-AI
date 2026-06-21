"""
Voice Validation Modal App - Real audio quality analysis service.

Provides comprehensive audio analysis including:
- Noise level detection
- Clarity and consistency scoring  
- Duration and format validation
- Overall quality assessment
"""

import io
import tempfile
from typing import Dict, Any, Optional

import modal

# Audio analysis dependencies
audio_deps = [
    "librosa==0.10.1",
    "soundfile==0.12.1", 
    "numpy==1.24.3",
    "scipy==1.11.1",
    "fastapi[standard]",
]

# Create image with dependencies
voice_analysis_image = modal.Image.debian_slim().pip_install(audio_deps)

app = modal.App("voice-validation", image=voice_analysis_image)

# Import with the image context
with voice_analysis_image.imports():
    import librosa
    import soundfile as sf
    import numpy as np
    from pydantic import BaseModel
    from fastapi import FastAPI, HTTPException, Security
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.security import APIKeyHeader

    # Auth helpers
    api_key_scheme = APIKeyHeader(
        name="x-api-key",
        scheme_name="ApiKeyAuth", 
        auto_error=False,
    )

    def verify_api_key(x_api_key: str | None = Security(api_key_scheme)):
        import os
        expected = os.environ.get("MIMIC_API_KEY", "")
        if not expected or x_api_key != expected:
            raise HTTPException(status_code=403, detail="Invalid API key")
        return x_api_key

@app.function(
    image=voice_analysis_image,
    timeout=300,
    cpu=2.0
)
def analyze_audio(audio_data: bytes, filename: str) -> Dict[str, Any]:
    """
    Analyze audio quality and return detailed metrics.
    
    Args:
        audio_data: Raw audio file bytes
        filename: Original filename for format detection
        
    Returns:
        Dictionary with analysis results including scores and metrics
    """
    try:
        # Load audio data
        with tempfile.NamedTemporaryFile(suffix=".wav") as temp_file:
            temp_file.write(audio_data)
            temp_file.flush()
            
            # Load with librosa
            y, sr = librosa.load(temp_file.name, sr=None, mono=True)
            
        # Basic audio properties
        duration = len(y) / sr
        
        # 1. Noise Level Analysis
        # Calculate RMS energy to detect background noise
        rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
        noise_floor = np.percentile(rms, 10)  # Bottom 10% as noise estimate
        signal_level = np.percentile(rms, 90)  # Top 90% as signal estimate
        
        if signal_level > 0:
            snr_estimate = 20 * np.log10(signal_level / max(noise_floor, 1e-6))
            noise_score = min(1.0, max(0.0, (snr_estimate - 10) / 30))  # 10-40 dB range
        else:
            noise_score = 0.0
            
        # 2. Clarity Analysis
        # Use spectral centroid and bandwidth for clarity
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
        
        # Higher, more consistent spectral centroid indicates clearer speech
        centroid_mean = np.mean(spectral_centroids)
        centroid_std = np.std(spectral_centroids)
        clarity_score = min(1.0, max(0.0, (centroid_mean / sr * 4) - (centroid_std / sr * 2)))
        
        # 3. Consistency Analysis
        # Analyze volume and pitch consistency
        hop_length = 512
        frame_length = 2048
        
        # Volume consistency (RMS variation)
        rms_std = np.std(rms)
        rms_mean = np.mean(rms)
        volume_consistency = 1.0 - min(1.0, rms_std / max(rms_mean, 1e-6))
        
        # Pitch consistency (for speech)
        try:
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr, hop_length=hop_length)
            pitch_values = []
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if pitch > 0:
                    pitch_values.append(pitch)
            
            if len(pitch_values) > 10:
                pitch_std = np.std(pitch_values)
                pitch_mean = np.mean(pitch_values)
                pitch_consistency = 1.0 - min(1.0, pitch_std / max(pitch_mean, 1e-6) / 2)
            else:
                pitch_consistency = 0.5
        except:
            pitch_consistency = 0.5
            
        consistency_score = (volume_consistency + pitch_consistency) / 2
        
        # 4. Overall Quality Score
        # Weighted combination of all factors
        weights = {
            'noise': 0.3,
            'clarity': 0.4, 
            'consistency': 0.3
        }
        
        overall_score = (
            weights['noise'] * noise_score +
            weights['clarity'] * clarity_score + 
            weights['consistency'] * consistency_score
        )
        
        # 5. Quality thresholds and recommendations
        if overall_score >= 0.8:
            quality_label = "excellent"
            recommendation = "Voice quality is excellent for TTS generation"
        elif overall_score >= 0.7:
            quality_label = "good"  
            recommendation = "Voice quality is good and ready for use"
        elif overall_score >= 0.4:
            quality_label = "acceptable"
            recommendation = "Voice quality is acceptable but could be improved"
        else:
            quality_label = "poor"
            recommendation = "Voice quality needs improvement before use"
            
        # Build detailed results
        validation_results = {
            "overall_score": round(overall_score, 3),
            "quality_label": quality_label,
            "recommendation": recommendation,
            "metrics": {
                "duration": round(duration, 2),
                "sample_rate": int(sr),
                "noise_score": round(noise_score, 3),
                "clarity_score": round(clarity_score, 3), 
                "consistency_score": round(consistency_score, 3),
                "signal_to_noise_ratio": round(snr_estimate, 1) if 'snr_estimate' in locals() else None,
                "spectral_centroid_mean": round(centroid_mean, 1),
                "volume_consistency": round(volume_consistency, 3),
                "pitch_consistency": round(pitch_consistency, 3)
            },
            "thresholds": {
                "auto_approve": overall_score >= 0.7,
                "needs_review": overall_score < 0.4,
                "min_duration": duration >= 10.0,
                "max_duration": duration <= 300.0
            },
            "analyzed_at": modal.now().isoformat()
        }
        
        return {
            "success": True,
            "validation_results": validation_results,
            "quality_score": overall_score
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Audio analysis failed: {str(e)}",
            "quality_score": 0.0
        }


# Health check endpoint
@app.function()
def health():
    """Health check endpoint for the voice validation service."""
    return {"status": "healthy", "service": "voice-validation"}


# Modal class for voice validation
@app.cls(
    secrets=[modal.Secret.from_name("mimic-api-key")],
    timeout=300,
    cpu=2.0,
)
class VoiceValidator:
    @modal.enter()
    def startup(self):
        print("[VoiceValidator] ready")

    @modal.method()
    def analyze_voice(self, audio_data: bytes, filename: str = "upload.wav") -> dict:
        """Analyze voice audio quality."""
        return analyze_audio(audio_data, filename)

    @modal.asgi_app()
    def web(self):
        web_app = FastAPI(
            title="Voice Validation Service",
            description="Analyze voice audio for quality and suitability",
            docs_url="/docs",
        )
        
        web_app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @web_app.post("/analyze")
        async def analyze_endpoint(audio_data: bytes):
            """Analyze uploaded audio and return quality metrics."""
            try:
                result = self.analyze_voice(audio_data, "upload.wav")
                return result
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @web_app.get("/health")
        def health():
            return {"status": "healthy", "service": "voice-validation"}

        return web_app


# Local testing entry point
@app.local_entrypoint()
def test():
    validator = VoiceValidator()
    print("Voice validation service ready for deployment")