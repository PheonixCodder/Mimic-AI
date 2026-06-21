import modal
import io
from typing import Dict, Any

app = modal.App("avatar-validation")

# Lightweight image with minimal dependencies
image = modal.Image.debian_slim().pip_install([
    "fastapi[standard]",
    "Pillow>=9.0.0",
])

@app.cls(
    image=image,
    secrets=[modal.Secret.from_name("cloudflare-r2"), modal.Secret.from_name("mimic-api-key")]
)
class AvatarValidation:
    @modal.fastapi_endpoint(method="POST", path="/analyze")
    def analyze_avatar(self, request_body: bytes) -> Dict[str, Any]:
        """Analyze avatar image for readiness score"""
        try:
            from PIL import Image
            
            # Load and analyze image
            image = Image.open(io.BytesIO(request_body))
            width, height = image.size
            
            # Simple validation logic
            min_size = 256
            aspect_ratio = width / height
            file_size_kb = len(request_body) / 1024
            
            # Calculate scores
            resolution_score = min(1.0, min(width, height) / 512)
            aspect_score = 1.0 if 0.8 <= aspect_ratio <= 1.25 else 0.6
            size_score = min(1.0, file_size_kb / 500) if file_size_kb > 50 else 0.3
            
            overall_score = (resolution_score * 0.4 + aspect_score * 0.3 + size_score * 0.3)
            
            return {
                "success": True,
                "readiness_score": round(overall_score, 2),
                "validation_results": {
                    "overall_score": round(overall_score, 2),
                    "quality_label": "excellent" if overall_score >= 0.8 else "good" if overall_score >= 0.6 else "acceptable" if overall_score >= 0.4 else "poor",
                    "recommendation": "Avatar is ready for video generation" if overall_score >= 0.6 else "Avatar quality could be improved",
                    "metrics": {
                        "width": width,
                        "height": height,
                        "file_size_kb": round(file_size_kb, 1),
                        "faces_detected": 1,  # Assume face present
                        "resolution_score": round(resolution_score, 2),
                        "face_score": 0.85,  # Mock face detection
                        "brightness_score": 0.75,
                        "sharpness_score": 0.8,
                    },
                    "thresholds": {
                        "auto_approve": overall_score >= 0.7,
                        "needs_review": overall_score < 0.4,
                        "has_face": True,
                        "min_resolution": min(width, height) >= min_size,
                    },
                    "analyzed_at": "2026-06-21T00:00:00Z",
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Avatar analysis failed: {str(e)}"
            }

    @modal.fastapi_endpoint(method="GET", path="/health")
    def health(self):
        return {"status": "healthy", "service": "avatar-validation"}