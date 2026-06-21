"""
Mimic AI — Caption Generation Modal App
Generates word/segment level subtitles from audio or video files.

Modes (controlled by CAPTION_GEN_MODE env var):
  simulate (default) — Rule-based script segmenter, no GPU or AI packages required
  whisper            — Real Faster-Whisper transcription (runs on CPU or low-cost GPU)
"""

from __future__ import annotations

import modal

# ---------------------------------------------------------------------------
# Shared constants
# ---------------------------------------------------------------------------

R2_BUCKET = "mimic-ai"
R2_ACCOUNT_ID = "aea0e987f8b0fcd0ed0c572a84d95622"

r2_secret = modal.Secret.from_name("cloudflare-r2")
api_key_secret = modal.Secret.from_name("mimic-api-key")

r2_mount = modal.CloudBucketMount(
    bucket_name=R2_BUCKET,
    bucket_endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    secret=r2_secret,
    read_only=False,
)

# ---------------------------------------------------------------------------
# Simulate mode image (Fast, light)
# ---------------------------------------------------------------------------

simulate_image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "fastapi[standard]",
        "pydantic",
        "numpy",
    )
)

# ---------------------------------------------------------------------------
# Whisper mode image (Real Faster-Whisper)
# ---------------------------------------------------------------------------

whisper_image = (
    modal.Image.debian_slim(python_version="3.10")
    .pip_install(
        "faster-whisper==1.0.3",
        "fastapi[standard]",
        "pydantic",
        "numpy",
        "huggingface_hub",
    )
)

import os as _os
CAPTION_GEN_MODE = _os.environ.get("CAPTION_GEN_MODE", "whisper")
active_image = whisper_image if CAPTION_GEN_MODE == "whisper" else simulate_image

app = modal.App("mimic-caption-generation", image=active_image)

# ---------------------------------------------------------------------------
# Core Implementation
# ---------------------------------------------------------------------------

with active_image.imports():
    import os
    import re
    from fastapi import Depends, FastAPI, HTTPException, Security
    from fastapi.security.api_key import APIKeyHeader
    from pydantic import BaseModel

    # ---- Pydantic models ---------------------------------------------------

    class CaptionCue(BaseModel):
        start: float
        end: float
        text: str

    class TranscribeRequest(BaseModel):
        video_r2_key: str
        transcript: str = ""

    class TranscribeResponse(BaseModel):
        subtitles: list[CaptionCue]

    # ---- Auth helper -------------------------------------------------------

    api_key_header = APIKeyHeader(name="X-Api-Key", auto_error=False)

    def _make_verify_api_key(api_key: str):
        async def verify_api_key(key: str = Security(api_key_header)):
            if key != api_key:
                raise HTTPException(status_code=401, detail="Invalid API key")
        return verify_api_key

    # ---- Simulation helper -------------------------------------------------

    def _simulate_subtitles(transcript: str) -> list[dict]:
        if not transcript:
            return [
                {"start": 0.5, "end": 3.0, "text": "This is a simulated subtitle cue."},
                {"start": 3.1, "end": 6.0, "text": "No transcript was provided for guided alignment."}
            ]
        
        # Split on sentence/phrase boundary markers
        raw_chunks = re.split(r'([.,!?\n]+)', transcript)
        
        chunks = []
        current_text = ""
        for item in raw_chunks:
            if not item.strip():
                continue
            if re.match(r'^[.,!?\n]+$', item):
                current_text += item.strip()
                chunks.append(current_text)
                current_text = ""
            else:
                if current_text:
                    chunks.append(current_text)
                current_text = item.strip()
        if current_text:
            chunks.append(current_text)
            
        cues = []
        current_time = 0.5
        for chunk in chunks:
            chunk = chunk.strip()
            # Replace duplicate spaces or newlines with a single space
            chunk = re.sub(r'\s+', ' ', chunk)
            if not chunk:
                continue
            words = chunk.split()
            word_count = len(words)
            if word_count == 0:
                continue
                
            # Average reading/speech speed: ~3 words per second (0.35s per word)
            duration = max(1.0, word_count * 0.35)
            end_time = current_time + duration
            cues.append({
                "start": round(current_time, 2),
                "end": round(end_time, 2),
                "text": chunk
            })
            current_time = end_time + 0.1
            
        return cues


# ---------------------------------------------------------------------------
# Modal Serverless Class
# ---------------------------------------------------------------------------

@app.cls(
    image=active_image,
    secrets=[r2_secret, api_key_secret],
    volumes={"/r2": r2_mount},
    scaledown_window=60 * 5,
    timeout=300,
)
@modal.concurrent(max_inputs=10)
class CaptionGeneration:
    @modal.enter()
    def setup(self):
        self._api_key = os.environ.get("MIMIC_API_KEY", "")
        self._verify = _make_verify_api_key(self._api_key)
        
        # In whisper mode, load the faster-whisper model
        if CAPTION_GEN_MODE == "whisper":
            from faster_whisper import WhisperModel
            # Load Whisper model onto CPU (base model is fast and light)
            self.model = WhisperModel("base", device="cpu", compute_type="int8")

    def _transcribe_file(self, req: TranscribeRequest) -> list[CaptionCue]:
        # Path to file in Cloudflare R2 mount
        file_path = f"/r2/{req.video_r2_key}"
        
        # Verify file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Source file not found in R2 mount: {req.video_r2_key}")

        if CAPTION_GEN_MODE == "whisper":
            # Real Faster-Whisper transcription
            segments, info = self.model.transcribe(file_path, beam_size=5)
            cues = []
            for segment in segments:
                cues.append(
                    CaptionCue(
                        start=round(segment.start, 2),
                        end=round(segment.end, 2),
                        text=segment.text.strip()
                    )
                )
            # If whisper transcribed nothing but we have a transcript, fallback to simulation
            if not cues and req.transcript:
                sim_cues = _simulate_subtitles(req.transcript)
                return [CaptionCue(**c) for c in sim_cues]
            return cues
        else:
            # Simulated transcription
            sim_cues = _simulate_subtitles(req.transcript)
            return [CaptionCue(**c) for c in sim_cues]

    @modal.asgi_app()
    def web(self):
        verify = self._verify
        fast_app = FastAPI(title="Mimic Caption Generation", version="1.0.0")

        @fast_app.get("/health")
        async def health():
            return {"status": "ok", "mode": CAPTION_GEN_MODE}

        @fast_app.post(
            "/transcribe",
            response_model=TranscribeResponse,
            dependencies=[Depends(verify)],
        )
        async def transcribe(req: TranscribeRequest):
            try:
                cues = self._transcribe_file(req)
                return TranscribeResponse(subtitles=cues)
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        return fast_app


# ---------------------------------------------------------------------------
# Local entrypoint for testing
# ---------------------------------------------------------------------------

@app.local_entrypoint()
def test(
    video_key: str = "videos/test/output.mp4",
    transcript: str = "Welcome to Mimic AI. We are testing the serverless caption generation service.",
):
    gen = CaptionGeneration()
    req = TranscribeRequest(
        video_r2_key=video_key,
        transcript=transcript,
    )
    try:
        result = gen._transcribe_file.remote(req)
        print(f"\n--- Subtitles Generated Successfully ---")
        for cue in result:
            print(f"[{cue.start}s -> {cue.end}s]: {cue.text}")
    except Exception as e:
        print(f"Transcription failed: {e}")
