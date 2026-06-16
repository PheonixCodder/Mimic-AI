"""
Mimic AI — Video Generation Modal App
Generates short AI video clips from text prompts.

Modes (controlled by VIDEO_GEN_MODE env var):
  simulate (default) — OpenCV animated video, no GPU required
  wan2               — Real Wan2.1 text-to-video model, A100 required
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
# Simulate mode image (OpenCV, no GPU)
# ---------------------------------------------------------------------------

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

# ---------------------------------------------------------------------------
# Wan2 mode image (GPU, real generation)
# ---------------------------------------------------------------------------

wan2_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.1.1-devel-ubuntu20.04",
        add_python="3.10",
    )
    .apt_install("ffmpeg", "git", "libgl1")
    .pip_install(
        "torch==2.1.2",
        "torchvision",
        "diffusers>=0.26.0",
        "transformers>=4.38.0",
        "accelerate",
        "huggingface_hub",
        "imageio[ffmpeg]",
        "fastapi[standard]",
        "pydantic",
        "opencv-python-headless",
        "numpy",
    )
)

wan2_volume = modal.Volume.from_name("wan2-cache", create_if_missing=True)

import os as _os
VIDEO_GEN_MODE = _os.environ.get("VIDEO_GEN_MODE", "simulate")
active_image = wan2_image if VIDEO_GEN_MODE == "wan2" else simulate_image

app = modal.App("mimic-video-generation", image=active_image)


# ---------------------------------------------------------------------------
# Simulate mode implementation
# ---------------------------------------------------------------------------

with active_image.imports():
    import os
    import math
    import subprocess
    import tempfile
    import numpy as np
    import cv2
    from fastapi import Depends, FastAPI, HTTPException, Security
    from fastapi.security.api_key import APIKeyHeader
    from pydantic import BaseModel

    # ---- Pydantic models ---------------------------------------------------

    class ClipRequest(BaseModel):
        prompt: str
        style: str = "cinematic"
        duration_seconds: int = 5
        aspect_ratio: str = "16:9"
        output_r2_key: str

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

    # ---- Dimensions helper -------------------------------------------------

    def _dimensions(aspect_ratio: str) -> tuple[int, int]:
        mapping = {
            "16:9": (1280, 720),
            "9:16": (720, 1280),
            "1:1": (720, 720),
        }
        return mapping.get(aspect_ratio, (1280, 720))

    # ---- Frame generators --------------------------------------------------

    def _frame_cinematic(frame_idx: int, total_frames: int, w: int, h: int) -> np.ndarray:
        """Dark cinematic gradient with slow horizontal pan and film grain."""
        t = frame_idx / max(total_frames - 1, 1)
        shift = int(t * w * 0.08)
        img = np.zeros((h, w, 3), dtype=np.float32)
        for x in range(w):
            fx = (x + shift) / w
            r = 0.04 + fx * 0.08
            g = 0.03 + fx * 0.05
            b = 0.07 + fx * 0.15
            img[:, x] = [b, g, r]
        img = (np.clip(img, 0, 1) * 255).astype(np.uint8)
        grain = np.random.normal(0, 6, img.shape).astype(np.int16)
        img = np.clip(img.astype(np.int16) + grain, 0, 255).astype(np.uint8)
        return img

    def _frame_animated(frame_idx: int, total_frames: int, w: int, h: int) -> np.ndarray:
        """Colourful animated circles moving across the frame."""
        img = np.full((h, w, 3), (20, 20, 30), dtype=np.uint8)
        t = frame_idx / max(total_frames - 1, 1)
        circles = [
            {"color": (255, 120, 60), "r": 80, "sx": 0.3, "sy": 0.5, "speed": 0.15},
            {"color": (60, 200, 255), "r": 60, "sx": 0.7, "sy": 0.3, "speed": -0.12},
            {"color": (180, 60, 255), "r": 50, "sx": 0.5, "sy": 0.7, "speed": 0.08},
            {"color": (60, 255, 120), "r": 40, "sx": 0.2, "sy": 0.8, "speed": -0.10},
        ]
        for c in circles:
            cx = int((c["sx"] + math.sin(t * 2 * math.pi * c["speed"]) * 0.25) * w)
            cy = int((c["sy"] + math.cos(t * 2 * math.pi * c["speed"]) * 0.25) * h)
            overlay = img.copy()
            cv2.circle(overlay, (cx, cy), c["r"], c["color"], -1)
            img = cv2.addWeighted(overlay, 0.6, img, 0.4, 0)
        return img

    def _frame_abstract(frame_idx: int, total_frames: int, w: int, h: int) -> np.ndarray:
        """Rotating HSV gradient."""
        t = frame_idx / max(total_frames - 1, 1)
        img = np.zeros((h, w, 3), dtype=np.uint8)
        cx, cy = w / 2, h / 2
        for y in range(0, h, 2):
            for x in range(0, w, 2):
                angle = math.atan2(y - cy, x - cx)
                dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / max(w, h)
                hue = int((angle / (2 * math.pi) + t + dist) * 180) % 180
                sat = 200 + int(dist * 55)
                val = 180 + int(math.sin(t * math.pi * 4 + dist * 10) * 40)
                img[y, x] = [hue, min(sat, 255), min(val, 255)]
                if y + 1 < h:
                    img[y + 1, x] = [hue, min(sat, 255), min(val, 255)]
                if x + 1 < w:
                    img[y, x + 1] = [hue, min(sat, 255), min(val, 255)]
                if y + 1 < h and x + 1 < w:
                    img[y + 1, x + 1] = [hue, min(sat, 255), min(val, 255)]
        return cv2.cvtColor(img, cv2.COLOR_HSV2BGR)

    def _frame_nature(frame_idx: int, total_frames: int, w: int, h: int) -> np.ndarray:
        """Green/blue gradient with animated bokeh circles."""
        t = frame_idx / max(total_frames - 1, 1)
        img = np.zeros((h, w, 3), dtype=np.uint8)
        for y in range(h):
            fy = y / h
            r = int(80 + fy * 30)
            g = int(120 + fy * 60)
            b = int(200 - fy * 80)
            img[y, :] = [b, g, r]
        np.random.seed(42)
        bokeh_count = 12
        bx = (np.random.rand(bokeh_count) * w).astype(int)
        by = (np.random.rand(bokeh_count) * h).astype(int)
        br = (np.random.rand(bokeh_count) * 40 + 15).astype(int)
        bc = [(255, 255, 200), (200, 255, 180), (180, 230, 255)]
        for i in range(bokeh_count):
            cx = int(bx[i] + math.sin(t * math.pi * 2 + i) * 30) % w
            cy = int(by[i] + math.cos(t * math.pi * 2 + i * 0.7) * 20) % h
            blurred = img.copy()
            cv2.circle(blurred, (cx, cy), br[i], bc[i % len(bc)], -1)
            img = cv2.addWeighted(blurred, 0.25, img, 0.75, 0)
            img = cv2.GaussianBlur(img, (5, 5), 0)
        return img

    def _frame_minimal(frame_idx: int, total_frames: int, w: int, h: int) -> np.ndarray:
        """Clean light background with a slow moving subtle horizontal line."""
        t = frame_idx / max(total_frames - 1, 1)
        img = np.full((h, w, 3), 245, dtype=np.uint8)
        line_y = int(h * 0.5 + math.sin(t * math.pi * 2) * h * 0.15)
        cv2.line(img, (0, line_y), (w, line_y), (200, 200, 200), 1)
        cv2.line(img, (0, line_y + 4), (w, line_y + 4), (220, 220, 220), 1)
        return img

    FRAME_GENERATORS = {
        "cinematic": _frame_cinematic,
        "animated": _frame_animated,
        "abstract": _frame_abstract,
        "nature": _frame_nature,
        "minimal": _frame_minimal,
    }

    # ---- Auth helper -------------------------------------------------------

    api_key_header = APIKeyHeader(name="X-Api-Key", auto_error=False)

    def _make_verify_api_key(api_key: str):
        async def verify_api_key(key: str = Security(api_key_header)):
            if key != api_key:
                raise HTTPException(status_code=401, detail="Invalid API key")
        return verify_api_key



# ---------------------------------------------------------------------------
# Simulate mode Modal class
# ---------------------------------------------------------------------------

@app.cls(
    image=simulate_image,
    secrets=[r2_secret, api_key_secret],
    volumes={"/r2": r2_mount},
    scaledown_window=60 * 5,
    timeout=300,
)
@modal.concurrent(max_inputs=4)
class SimulateVideoGen:
    @modal.enter()
    def setup(self):
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
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(raw_path, fourcc, fps, (w, h))
            for i in range(total_frames):
                frame = gen_fn(i, total_frames, w, h)
                writer.write(frame)
            writer.release()

            # Add silent audio track via ffmpeg
            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", raw_path,
                    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                    "-c:a", "aac", "-shortest",
                    out_path,
                ],
                capture_output=True,
                check=True,
            )

            # Write to R2 mount
            r2_dest = f"/r2/{req.output_r2_key}"
            os.makedirs(os.path.dirname(r2_dest), exist_ok=True)
            with open(out_path, "rb") as f:
                data = f.read()
            with open(r2_dest, "wb") as f:
                f.write(data)

        return ClipResponse(
            output_r2_key=req.output_r2_key,
            duration_seconds=float(duration),
            width=w,
            height=h,
        )

    @modal.asgi_app()
    def web(self):
        verify = self._verify
        fast_app = FastAPI(title="Mimic Video Generation", version="1.0.0")

        @fast_app.get("/health")
        async def health():
            return {"status": "ok", "mode": "simulate"}

        @fast_app.post(
            "/generate",
            response_model=ClipResponse,
            dependencies=[Depends(verify)],
        )
        async def generate(req: ClipRequest):
            return self._generate_clip(req)

        @fast_app.post(
            "/preview",
            response_model=ClipResponse,
            dependencies=[Depends(verify)],
        )
        async def preview(req: ClipRequest):
            short = ClipRequest(
                prompt=req.prompt,
                style=req.style,
                duration_seconds=3,
                aspect_ratio=req.aspect_ratio,
                output_r2_key=req.output_r2_key,
            )
            return self._generate_clip(short)

        @fast_app.post(
            "/validate",
            response_model=ValidateResponse,
            dependencies=[Depends(verify)],
        )
        async def validate(req: ValidateRequest):
            if len(req.prompt.strip()) < 5:
                return ValidateResponse(valid=False, message="Prompt is too short")
            return ValidateResponse(valid=True, message="Prompt looks good")

        return fast_app


# ---------------------------------------------------------------------------
# Local entrypoint for testing
# ---------------------------------------------------------------------------

@app.local_entrypoint()
def test(
    prompt: str = "A beautiful sunset over the ocean",
    style: str = "cinematic",
    output_key: str = "clips/test/output.mp4",
):
    gen = SimulateVideoGen()
    req = ClipRequest(
        prompt=prompt,
        style=style,
        duration_seconds=5,
        aspect_ratio="16:9",
        output_r2_key=output_key,
    )
    result = gen._generate_clip.remote(req)
    print(f"Generated: {result}")
