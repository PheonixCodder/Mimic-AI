"""
Mimic AI — Simulate Video Generation (CPU, no GPU)

Deploy:
  modal deploy modal/video_generation_simulate.py
"""

from __future__ import annotations

import math
import modal

R2_BUCKET = "mimic-ai"
R2_ACCOUNT_ID = "aea0e987f8b0fcd0ed0c572a84d95622"
R2_MOUNT_PATH = "/r2"

r2_secret = modal.Secret.from_name("cloudflare-r2")
api_key_secret = modal.Secret.from_name("mimic-api-key")

r2_mount = modal.CloudBucketMount(
    bucket_name=R2_BUCKET,
    bucket_endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    secret=r2_secret,
    read_only=False,
)

simulate_image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "opencv-python-headless",
        "numpy",
        "pillow",
        "fastapi[standard]",
        "pydantic",
    )
    .apt_install("ffmpeg")
)

app = modal.App("mimic-video-generation-simulate", image=simulate_image)

with simulate_image.imports():
    import os
    import subprocess
    import tempfile

    import cv2
    import numpy as np
    from fastapi import Depends, FastAPI, HTTPException, Security
    from fastapi.security.api_key import APIKeyHeader
    from pydantic import BaseModel

    class ClipRequest(BaseModel):
        prompt: str
        style: str = "cinematic"
        duration_seconds: int = 5
        aspect_ratio: str = "16:9"
        output_r2_key: str
        watermark_enabled: bool = True
        watermark_text: str = "mimic.ai"
        watermark_type: str = "text"
        watermark_position: str = "bottom-right"
        watermark_opacity: float = 0.4
        watermark_size: str = "medium"
        watermark_logo_key: str | None = None

    class ClipResponse(BaseModel):
        output_r2_key: str
        duration_seconds: float
        width: int
        height: int

    class ValidateRequest(BaseModel):
        prompt: str

    class ValidateResponse(BaseModel):
        valid: bool
        message: str

    def _dimensions(aspect_ratio: str) -> tuple[int, int]:
        mapping = {"16:9": (1280, 720), "9:16": (720, 1280), "1:1": (720, 720)}
        return mapping.get(aspect_ratio, (1280, 720))

    def _frame_cinematic(frame_idx: int, total_frames: int, w: int, h: int) -> np.ndarray:
        t = frame_idx / max(total_frames - 1, 1)
        shift = int(t * w * 0.08)
        img = np.zeros((h, w, 3), dtype=np.float32)
        for x in range(w):
            fx = (x + shift) / w
            img[:, x] = [0.07 + fx * 0.15, 0.03 + fx * 0.05, 0.04 + fx * 0.08]
        img = (np.clip(img, 0, 1) * 255).astype(np.uint8)
        grain = np.random.normal(0, 6, img.shape).astype(np.int16)
        return np.clip(img.astype(np.int16) + grain, 0, 255).astype(np.uint8)

    FRAME_GENERATORS = {"cinematic": _frame_cinematic}

    def _apply_watermark(frame: np.ndarray, req: ClipRequest) -> np.ndarray:
        if not req.watermark_enabled:
            return frame
        h, w = frame.shape[:2]
        text = req.watermark_text or "mimic.ai"
        opacity = max(0.1, min(1.0, float(req.watermark_opacity)))
        overlay = frame.copy()
        cv2.putText(overlay, text, (w - 180, h - 24), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        return cv2.addWeighted(overlay, opacity, frame, 1.0 - opacity, 0)

    api_key_header = APIKeyHeader(name="X-Api-Key", auto_error=False)

    def _make_verify_api_key(api_key: str):
        async def verify_api_key(key: str = Security(api_key_header)):
            if key != api_key:
                raise HTTPException(status_code=401, detail="Invalid API key")

        return verify_api_key


@app.cls(
    image=simulate_image,
    secrets=[r2_secret, api_key_secret],
    volumes={R2_MOUNT_PATH: r2_mount},
    scaledown_window=60 * 5,
    timeout=300,
)
@modal.concurrent(max_inputs=4)
class SimulateVideoGen:
    @modal.enter()
    def setup(self):
        self.mode = "simulate"
        self._api_key = os.environ.get("MIMIC_API_KEY", "")
        self._verify = _make_verify_api_key(self._api_key)

    def _generate_clip(self, req: ClipRequest) -> ClipResponse:
        w, h = _dimensions(req.aspect_ratio)
        fps = 24
        duration = max(3, min(req.duration_seconds, 30))
        total_frames = fps * duration
        gen_fn = FRAME_GENERATORS.get(req.style, _frame_cinematic)

        with tempfile.TemporaryDirectory() as tmp:
            raw_path = os.path.join(tmp, "raw.mp4")
            out_path = os.path.join(tmp, "output.mp4")
            writer = cv2.VideoWriter(raw_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
            for i in range(total_frames):
                writer.write(_apply_watermark(gen_fn(i, total_frames, w, h), req))
            writer.release()

            subprocess.run(
                [
                    "ffmpeg", "-y", "-i", raw_path,
                    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                    "-c:a", "aac", "-shortest", out_path,
                ],
                capture_output=True,
                check=True,
            )

            r2_dest = f"{R2_MOUNT_PATH}/{req.output_r2_key}"
            os.makedirs(os.path.dirname(r2_dest), exist_ok=True)
            with open(out_path, "rb") as src, open(r2_dest, "wb") as dst:
                dst.write(src.read())

        return ClipResponse(
            output_r2_key=req.output_r2_key,
            duration_seconds=float(duration),
            width=w,
            height=h,
        )

    @modal.asgi_app()
    def web(self):
        verify = self._verify
        fast_app = FastAPI(title="Mimic Video Generation (Simulate)", version="1.0.0")

        @fast_app.get("/health")
        async def health():
            return {"status": "ok", "mode": self.mode}

        @fast_app.post("/generate", response_model=ClipResponse, dependencies=[Depends(verify)])
        async def generate(req: ClipRequest):
            return self._generate_clip(req)

        @fast_app.post("/preview", response_model=ClipResponse, dependencies=[Depends(verify)])
        async def preview(req: ClipRequest):
            return self._generate_clip(req.model_copy(update={"duration_seconds": 3}))

        @fast_app.post("/validate", response_model=ValidateResponse, dependencies=[Depends(verify)])
        async def validate(req: ValidateRequest):
            if len(req.prompt.strip()) < 5:
                return ValidateResponse(valid=False, message="Prompt is too short")
            return ValidateResponse(valid=True, message="Prompt looks good")

        return fast_app
