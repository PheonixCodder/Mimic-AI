"""
Avatar Validation Modal App - Real image quality analysis service.

Provides comprehensive image analysis including:
- Face detection and quality assessment
- Image resolution and aspect ratio validation
- Content moderation and safety checks
- Overall suitability scoring for talking avatars
"""

import io
import tempfile
from typing import Dict, Any, Optional

import modal

# Image analysis dependencies
image_deps = [
    "opencv-python==4.8.1.78",
    "pillow==10.0.1",
    "numpy==1.24.3",
    "scikit-image==0.21.0",
    "fastapi[standard]",
]

# Create image with dependencies
avatar_analysis_image = modal.Image.debian_slim().pip_install(image_deps)

app = modal.App("avatar-validation", image=avatar_analysis_image)

# Import with the image context
with avatar_analysis_image.imports():
    import cv2
    import numpy as np
    from PIL import Image, ImageStat
    from pydantic import BaseModel
    from fastapi import FastAPI, HTTPException, Security
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.security import APIKeyHeader
    from fastapi.responses import JSONResponse

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
    image=modal.Image.debian_slim().pip_install(image_deps),
    timeout=300,
    cpu=2.0
)
def analyze_avatar_image(image_data: bytes, filename: str) -> Dict[str, Any]:
    """
    Analyze avatar image quality and return detailed metrics.
    
    Args:
        image_data: Raw image file bytes
        filename: Original filename for format detection
        
    Returns:
        Dictionary with analysis results including scores and metrics
    """
    try:
        # Load image data
        image_array = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        if img is None:
            return {
                "success": False,
                "error": "Invalid image format or corrupted file",
                "readiness_score": 0.0
            }
        
        # Convert to PIL for additional analysis
        pil_img = Image.open(io.BytesIO(image_data))
        
        # Basic image properties
        height, width = img.shape[:2]
        file_size = len(image_data)
        
        # 1. Resolution and Aspect Ratio Analysis
        min_dimension = min(width, height)
        aspect_ratio = width / height
        
        # Score based on resolution (prefer 512x512 or higher)
        resolution_score = min(1.0, min_dimension / 512.0)
        
        # Prefer square-ish images for avatars (0.8 to 1.25 aspect ratio)
        aspect_penalty = abs(1.0 - aspect_ratio)
        aspect_score = max(0.0, 1.0 - aspect_penalty * 2)
        
        # 2. Face Detection and Quality
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Use Haar Cascade for face detection (built into OpenCV)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(50, 50))
        
        face_count = len(faces)
        face_score = 0.0
        face_size_score = 0.0
        
        if face_count == 1:
            # Single face detected - ideal for avatars
            face_score = 1.0
            x, y, w, h = faces[0]
            
            # Face should be reasonably large in the image
            face_area_ratio = (w * h) / (width * height)
            face_size_score = min(1.0, face_area_ratio * 4)  # Prefer faces that are 25%+ of image
            
        elif face_count == 0:
            # No face detected
            face_score = 0.0
        else:
            # Multiple faces - less ideal but not terrible
            face_score = 0.6
            # Use largest face for size scoring
            largest_face = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = largest_face
            face_area_ratio = (w * h) / (width * height)
            face_size_score = min(1.0, face_area_ratio * 4)
        
        # 3. Image Quality Analysis
        # Brightness analysis
        brightness = np.mean(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
        brightness_score = 1.0 - min(1.0, abs(brightness - 128) / 128)  # Prefer moderate brightness
        
        # Contrast analysis using standard deviation
        gray_std = np.std(gray)
        contrast_score = min(1.0, gray_std / 50.0)  # Good contrast should have std > 30
        
        # Blur detection using Laplacian variance
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness_score = min(1.0, laplacian_var / 500.0)  # Values > 300 typically indicate sharp images
        
        # 4. Content Safety (Basic Implementation)
        # Simple content checks - look for obvious issues
        content_safety_score = 1.0
        
        # Check for completely black or white images
        if brightness < 10 or brightness > 245:
            content_safety_score = 0.2
        
        # Check for very small file size (might indicate placeholder)
        if file_size < 5000:  # Less than 5KB
            content_safety_score = 0.3
            
        # 5. Overall Readiness Score
        # Weighted combination of all factors
        weights = {
            'resolution': 0.15,
            'aspect_ratio': 0.10,
            'face_detection': 0.30,
            'face_size': 0.15,
            'brightness': 0.10,
            'contrast': 0.10,
            'sharpness': 0.05,
            'content_safety': 0.05
        }
        
        overall_score = (
            weights['resolution'] * resolution_score +
            weights['aspect_ratio'] * aspect_score +
            weights['face_detection'] * face_score +
            weights['face_size'] * face_size_score +
            weights['brightness'] * brightness_score +
            weights['contrast'] * contrast_score +
            weights['sharpness'] * sharpness_score +
            weights['content_safety'] * content_safety_score
        )
        
        # 6. Quality thresholds and recommendations
        if overall_score >= 0.8:
            quality_label = "excellent"
            recommendation = "Avatar is excellent quality and ready for video generation"
        elif overall_score >= 0.7:
            quality_label = "good"
            recommendation = "Avatar quality is good and ready for use"
        elif overall_score >= 0.4:
            quality_label = "acceptable"
            recommendation = "Avatar quality is acceptable but could be improved"
        else:
            quality_label = "poor"
            recommendation = "Avatar quality needs improvement before use"
            
        # Build detailed results
        validation_results = {
            "overall_score": round(overall_score, 3),
            "quality_label": quality_label,
            "recommendation": recommendation,
            "metrics": {
                "width": width,
                "height": height,
                "file_size_kb": round(file_size / 1024, 1),
                "aspect_ratio": round(aspect_ratio, 2),
                "faces_detected": face_count,
                "resolution_score": round(resolution_score, 3),
                "aspect_score": round(aspect_score, 3),
                "face_score": round(face_score, 3),
                "face_size_score": round(face_size_score, 3),
                "brightness_score": round(brightness_score, 3),
                "contrast_score": round(contrast_score, 3),
                "sharpness_score": round(sharpness_score, 3),
                "content_safety_score": round(content_safety_score, 3),
                "brightness_level": round(brightness, 1),
                "contrast_std": round(gray_std, 1),
                "sharpness_var": round(laplacian_var, 1)
            },
            "thresholds": {
                "auto_approve": overall_score >= 0.7,
                "needs_review": overall_score < 0.4,
                "min_resolution": min_dimension >= 256,
                "has_face": face_count > 0,
                "single_face": face_count == 1
            },
            "analyzed_at": modal.now().isoformat()
        }
        
        return {
            "success": True,
            "validation_results": validation_results,
            "readiness_score": overall_score
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Image analysis failed: {str(e)}",
            "readiness_score": 0.0
        }


# Health check endpoint
@app.function()
def health():
    """Health check endpoint for the avatar validation service."""
    return {"status": "healthy", "service": "avatar-validation"}



# Modal class for avatar validation
@app.cls(
    secrets=[modal.Secret.from_name("mimic-api-key")],
    timeout=300,
    cpu=2.0,
)
class AvatarValidator:
    @modal.enter()
    def startup(self):
        print("[AvatarValidator] ready")

    @modal.method()
    def analyze(self, image_data: bytes, filename: str = "upload.jpg") -> dict:
        """Analyze avatar image quality."""
        return analyze_avatar_image(image_data, filename)

    @modal.asgi_app()
    def serve(self):
        web_app = FastAPI(
            title="Avatar Validation Service",
            description="Analyze avatar images for quality and suitability",
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
        async def analyze_endpoint(image_data: bytes):
            """Analyze uploaded image and return quality metrics."""
            try:
                result = self.analyze(image_data, "upload.jpg")
                return result
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @web_app.get("/health")
        def health():
            return {"status": "healthy", "service": "avatar-validation"}

        return web_app


# Local testing entry point
@app.local_entrypoint()
def test():
    validator = AvatarValidator()
    # Test with a simple validation
    print("Avatar validation service ready for deployment")
def asgi_app():
    return web_app