"""Mimic AI Talking Avatar — generates talking-head videos from a static
portrait image and an audio file.

Two execution modes, selected by the AVATAR_MODE env-var:

  simulate  (default) — fast OpenCV-based face-motion simulation, no GPU
  hallo3              — real GPU inference via the Hallo3 pipeline

Deploy:
  modal deploy modal/talking_avatar.py

Test locally:
  modal run modal/talking_avatar.py

CURL:
  curl -X POST "https://<your-modal-endpoint>/generate" \
    -H "Content-Type: application/json" \
    -H "X-Api-Key: <your-api-key>" \
    -d '{"photo_r2_key":"avatars/system/sample.png",
         "audio_r2_key":"voices/system/default.wav",
         "output_r2_key":"videos/test/output.mp4"}'
"""

from __future__ import annotations

import modal

# ---------------------------------------------------------------------------
# R2 cloud-bucket mount (writeable so we can write output videos)
# ---------------------------------------------------------------------------
R2_BUCKET_NAME = "mimic-ai"
R2_ACCOUNT_ID = "aea0e987f8b0fcd0ed0c572a84d95622"
R2_MOUNT_PATH = "/r2"

r2_bucket = modal.CloudBucketMount(
    R2_BUCKET_NAME,
    bucket_endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    secret=modal.Secret.from_name("cloudflare-r2"),
    read_only=False,
)

# ---------------------------------------------------------------------------
# Hallo3 volume for model-weight caching
# ---------------------------------------------------------------------------
hallo3_volume = modal.Volume.from_name("hallo3-cache", create_if_missing=True)


def download_hallo3_models():
    from huggingface_hub import snapshot_download

    snapshot_download(
        "fudan-generative-ai/hallo3",
        local_dir="/models/pretrained_models",
        ignore_patterns=[],
    )


# ---------------------------------------------------------------------------
# Images
# ---------------------------------------------------------------------------
simulate_image = modal.Image.debian_slim(python_version="3.12").apt_install(
    "ffmpeg",
).pip_install(
    "opencv-python-headless",
    "numpy",
    "pydub",
    "pillow",
    "fastapi[standard]",
)

hallo3_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.1.1-devel-ubuntu22.04", add_python="3.11"
    )
    .env({"DEBIAN_FRONTEND": "noninteractive"})
    .apt_install(
        "git",
        "ffmpeg",
        "clang",
        "libaio-dev",
        "pkg-config",
        "libavformat-dev",
        "libavcodec-dev",
        "libavdevice-dev",
        "libavutil-dev",
        "libswscale-dev",
        "libswresample-dev",
        "libavfilter-dev",
    )
    .run_commands(
        "git clone --depth 1 https://github.com/fudan-generative-vision/hallo3 /hallo3",
        "sed -i '/^pyav/d' /hallo3/requirements.txt",
        "python -m pip install --upgrade pip",
        "pip install -r /hallo3/requirements.txt",
    )
    .run_commands("ln -sfn /models/pretrained_models /hallo3/pretrained_models")
    .run_function(download_hallo3_models, volumes={"/models": hallo3_volume})
)

# ---------------------------------------------------------------------------
# Choose image + settings based on AVATAR_MODE
# ---------------------------------------------------------------------------
import os as _os  # noqa: E402  — used only at module level for mode check

AVATAR_MODE = _os.environ.get("AVATAR_MODE", "simulate")

active_image = hallo3_image if AVATAR_MODE == "hallo3" else simulate_image

app = modal.App("mimic-talking-avatar", image=active_image)

# ---------------------------------------------------------------------------
# Imports gated behind the active image
# ---------------------------------------------------------------------------
with active_image.imports():
    import io
    import os
    import shutil
    import subprocess
    import tempfile
    import time
    from pathlib import Path

    import cv2
    import numpy as np
    from fastapi import Depends, FastAPI, HTTPException, Security
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.security import APIKeyHeader
    from PIL import Image
    from pydantic import BaseModel, Field
    from pydub import AudioSegment

    # ------------------------------------------------------------------
    # Auth helpers
    # ------------------------------------------------------------------
    api_key_scheme = APIKeyHeader(
        name="x-api-key",
        scheme_name="ApiKeyAuth",
        auto_error=False,
    )

    def verify_api_key(x_api_key: str | None = Security(api_key_scheme)):
        expected = os.environ.get("MIMIC_API_KEY", "")
        if not expected or x_api_key != expected:
            raise HTTPException(status_code=403, detail="Invalid API key")
        return x_api_key

    # ------------------------------------------------------------------
    # Request / Response models
    # ------------------------------------------------------------------
    class AvatarRequest(BaseModel):
        photo_r2_key: str = Field(..., min_length=1)
        audio_r2_key: str = Field(..., min_length=1)
        output_r2_key: str = Field(..., min_length=1)
        transcript: str = ""

    class AvatarResponse(BaseModel):
        output_r2_key: str
        duration_seconds: float

    class ValidateRequest(BaseModel):
        photo_r2_key: str = Field(..., min_length=1)

    class ValidateResponse(BaseModel):
        valid: bool
        face_detected: bool
        message: str


# Helper for ffmpeg error visibility
# ------------------------------------------------------------------

def _run_ffmpeg(
    args: list[str],
    *,
    check: bool = True,
    input_data: bytes | None = None,
) -> subprocess.CompletedProcess:
    """Run ffmpeg, capture stderr, and print it if the command fails."""
    print(f"[ffmpeg] {' '.join(args)}")
    proc = subprocess.run(
        args,
        input=input_data,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if proc.returncode != 0 and check:
        stderr = proc.stderr.decode("utf-8", errors="ignore") if proc.stderr else ""
        stdout = proc.stdout.decode("utf-8", errors="ignore") if proc.stdout else ""
        print(f"[ffmpeg] failed with exit code {proc.returncode}")
        print(f"[ffmpeg] stderr: {stderr}")
        print(f"[ffmpeg] stdout: {stdout}")
        raise subprocess.CalledProcessError(
            proc.returncode, args, output=proc.stdout, stderr=proc.stderr
        )
    return proc


# ===================================================================
# Simulate-mode helpers (OpenCV-based face-motion simulation)
# ===================================================================
def _detect_face(frame: np.ndarray):
    """Return (x, y, w, h) of the largest face or None."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(cascade_path)
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
    if len(faces) == 0:
        return None
    # Return the largest face
    return max(faces, key=lambda r: r[2] * r[3])


def _amplitude_envelope(audio_path: str, fps: int = 30):
    """Return a list of normalised amplitudes (0-1), one per video frame."""
    audio = AudioSegment.from_file(audio_path)
    ms_per_frame = 1000 / fps
    total_frames = int(len(audio) / ms_per_frame)
    if total_frames == 0:
        return [0.0]

    amplitudes: list[float] = []
    for i in range(total_frames):
        start_ms = int(i * ms_per_frame)
        end_ms = int(start_ms + ms_per_frame)
        chunk = audio[start_ms:end_ms]
        amplitudes.append(chunk.rms)

    max_amp = max(amplitudes) if amplitudes else 1
    if max_amp == 0:
        max_amp = 1
    return [a / max_amp for a in amplitudes]


def _simulate_talking(
    photo_path: str,
    audio_path: str,
    output_video_path: str,
    fps: int = 30,
):
    """Produce an .mp4 by animating the jaw/mouth region of *photo_path*
    in sync with the amplitude of *audio_path*, then mux audio in."""
    frame = cv2.imread(photo_path)
    if frame is None:
        raise ValueError(f"Cannot read image: {photo_path}")

    h, w = frame.shape[:2]
    face = _detect_face(frame)

    # If no face found, fall back to the lower-centre region
    if face is not None:
        fx, fy, fw, fh = face
        # Mouth region ≈ lower third of the face bounding box
        mouth_y = fy + int(fh * 0.6)
        mouth_h = fh - int(fh * 0.6)
        mouth_x = fx
        mouth_w = fw
    else:
        # Fallback: centre-bottom quarter
        mouth_x = w // 4
        mouth_y = h // 2
        mouth_w = w // 2
        mouth_h = h // 2

    amps = _amplitude_envelope(audio_path, fps)

    # Write frames to a local temp video (no audio) - avoid writing temp files to R2 mount
    tmp_dir = tempfile.mkdtemp()
    try:
        tmp_video = os.path.join(tmp_dir, "video.tmp.mp4")
        final_tmp = os.path.join(tmp_dir, "final.mp4")
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(tmp_video, fourcc, fps, (w, h))

        max_scale = 0.06  # max jaw-displacement as fraction of mouth_h

        for amp in amps:
            canvas = frame.copy()

            # Scale the mouth region vertically by a small amount
            displacement = int(max_scale * mouth_h * amp)
            if displacement < 1:
                writer.write(canvas)
                continue

            # Extract mouth ROI, stretch it vertically, paste it back
            roi = frame[mouth_y : mouth_y + mouth_h, mouth_x : mouth_x + mouth_w]
            stretched = cv2.resize(roi, (mouth_w, mouth_h + displacement))

            # Determine how much of the stretched ROI fits
            paste_h = min(stretched.shape[0], h - mouth_y)
            paste_w = min(stretched.shape[1], w - mouth_x)
            canvas[mouth_y : mouth_y + paste_h, mouth_x : mouth_x + paste_w] = (
                stretched[:paste_h, :paste_w]
            )

            writer.write(canvas)

        writer.release()

        # Merge audio + video with ffmpeg, then copy result to R2
        _run_ffmpeg(
            [
                "ffmpeg",
                "-y",
                "-i", tmp_video,
                "-i", audio_path,
                "-c:v", "libx264",
                "-preset", "fast",
                "-c:a", "aac",
                "-shortest",
                "-movflags", "+faststart",
                final_tmp,
            ]
        )

        os.makedirs(os.path.dirname(output_video_path), exist_ok=True)
        shutil.copy(final_tmp, output_video_path)
    finally:
        if os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir)


# ===================================================================
# Hallo3-mode helper
# ===================================================================
def _hallo3_generate(photo_path: str, audio_path: str, output_video_path: str, transcript: str = ""):
    """Run the full Hallo3 inference pipeline."""
    temp_dir = tempfile.mkdtemp()
    try:
        input_txt = os.path.join(temp_dir, "input.txt")
        with open(input_txt, "w") as f:
            f.write(f"{transcript}@@{photo_path}@@{audio_path}\n")

        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir, exist_ok=True)

        subprocess.run(
            [
                "bash",
                "/hallo3/scripts/inference_long_batch.sh",
                input_txt,
                output_dir,
            ],
            check=True,
            cwd="/hallo3",
        )

        # Find the generated video
        import glob

        generated = None
        for fpath in glob.glob(os.path.join(output_dir, "**", "*.mp4"), recursive=True):
            generated = fpath
            break
        if not generated:
            raise RuntimeError("Hallo3 did not produce a video file.")

        # Merge audio track with ffmpeg
        final_path = os.path.join(temp_dir, "final.mp4")
        _run_ffmpeg(
            [
                "ffmpeg",
                "-y",
                "-i", generated,
                "-i", audio_path,
                "-c:v", "copy",
                "-c:a", "aac",
                "-shortest",
                final_path,
            ]
        )

        # Copy to output
        os.makedirs(os.path.dirname(output_video_path), exist_ok=True)
        shutil.copy(final_path, output_video_path)
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)


# ===================================================================
# Modal class — Talking Avatar Server
# ===================================================================
_cls_kwargs: dict = dict(
    scaledown_window=60 * 5,
    secrets=[
        modal.Secret.from_name("cloudflare-r2"),
        modal.Secret.from_name("mimic-api-key"),
    ],
    volumes={R2_MOUNT_PATH: r2_bucket},
)

if AVATAR_MODE == "hallo3":
    _cls_kwargs.update(
        gpu="A100-80GB",
        timeout=2700,
        secrets=[
            modal.Secret.from_name("cloudflare-r2"),
            modal.Secret.from_name("hf-token"),
            modal.Secret.from_name("mimic-api-key"),
        ],
        volumes={
            R2_MOUNT_PATH: r2_bucket,
            "/models": hallo3_volume,
        },
    )


@app.cls(**_cls_kwargs)
@modal.concurrent(max_inputs=4)
class TalkingAvatar:
    @modal.enter()
    def startup(self):
        """Warm-up hook (no-op for simulate mode)."""
        self.mode = os.environ.get("AVATAR_MODE", "simulate")
        print(f"[TalkingAvatar] ready  mode={self.mode}")

    # ----------------------------------------------------------------
    # Core generation logic
    # ----------------------------------------------------------------
    def _generate(self, req: "AvatarRequest") -> "AvatarResponse":
        t0 = time.time()

        photo_path = str(Path(R2_MOUNT_PATH) / req.photo_r2_key)
        audio_path = str(Path(R2_MOUNT_PATH) / req.audio_r2_key)
        output_path = str(Path(R2_MOUNT_PATH) / req.output_r2_key)

        if not os.path.exists(photo_path):
            raise HTTPException(
                status_code=400,
                detail=f"Photo not found at '{req.photo_r2_key}'",
            )
        if not os.path.exists(audio_path):
            raise HTTPException(
                status_code=400,
                detail=f"Audio not found at '{req.audio_r2_key}'",
            )

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        if self.mode == "hallo3":
            _hallo3_generate(photo_path, audio_path, output_path, req.transcript)
        else:
            _simulate_talking(photo_path, audio_path, output_path)

        duration = round(time.time() - t0, 2)
        print(
            f"[generate] done  mode={self.mode}  "
            f"output={req.output_r2_key}  duration={duration}s"
        )
        return AvatarResponse(
            output_r2_key=req.output_r2_key,
            duration_seconds=duration,
        )

    # ----------------------------------------------------------------
    # Validate helper
    # ----------------------------------------------------------------
    def _validate_photo(self, photo_r2_key: str) -> "ValidateResponse":
        photo_path = str(Path(R2_MOUNT_PATH) / photo_r2_key)
        if not os.path.exists(photo_path):
            return ValidateResponse(
                valid=False,
                face_detected=False,
                message=f"Photo not found at '{photo_r2_key}'",
            )

        frame = cv2.imread(photo_path)
        if frame is None:
            return ValidateResponse(
                valid=False,
                face_detected=False,
                message="Could not decode image file",
            )

        face = _detect_face(frame)
        if face is None:
            return ValidateResponse(
                valid=False,
                face_detected=False,
                message="No face detected in photo",
            )

        return ValidateResponse(
            valid=True,
            face_detected=True,
            message="Photo is valid — face detected",
        )

    # ----------------------------------------------------------------
    # ASGI / FastAPI app
    # ----------------------------------------------------------------
    @modal.asgi_app()
    def serve(self):
        web_app = FastAPI(
            title="Mimic AI Talking Avatar",
            description="Generate talking-head videos from a portrait + audio",
            docs_url="/docs",
            dependencies=[Depends(verify_api_key)],
        )
        web_app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @web_app.post("/generate")
        def generate(request: AvatarRequest) -> AvatarResponse:
            """Full avatar animation — reads photo+audio from R2,
            writes output video to R2."""
            return self._generate(request)

        @web_app.post("/validate")
        def validate(request: ValidateRequest) -> ValidateResponse:
            """Quick face-detection check on the uploaded photo."""
            return self._validate_photo(request.photo_r2_key)

        @web_app.post("/preview")
        def preview(request: AvatarRequest) -> AvatarResponse:
            """Short 3-second preview (trims audio to 3 s before
            generating)."""
            audio_path = str(Path(R2_MOUNT_PATH) / request.audio_r2_key)
            if not os.path.exists(audio_path):
                raise HTTPException(
                    status_code=400,
                    detail=f"Audio not found at '{request.audio_r2_key}'",
                )

            # Trim audio to 3 seconds into a temp file
            audio = AudioSegment.from_file(audio_path)
            preview_audio = audio[:3000]  # first 3 seconds

            tmp_dir = tempfile.mkdtemp()
            try:
                trimmed_path = os.path.join(tmp_dir, "preview_audio.wav")
                preview_audio.export(trimmed_path, format="wav")

                # Swap the audio key to point at the trimmed file
                # We'll generate directly rather than re-routing through R2
                photo_path = str(Path(R2_MOUNT_PATH) / request.photo_r2_key)
                output_path = str(Path(R2_MOUNT_PATH) / request.output_r2_key)

                if not os.path.exists(photo_path):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Photo not found at '{request.photo_r2_key}'",
                    )

                os.makedirs(os.path.dirname(output_path), exist_ok=True)

                t0 = time.time()
                if self.mode == "hallo3":
                    _hallo3_generate(
                        photo_path, trimmed_path, output_path, request.transcript
                    )
                else:
                    _simulate_talking(photo_path, trimmed_path, output_path)

                duration = round(time.time() - t0, 2)
                return AvatarResponse(
                    output_r2_key=request.output_r2_key,
                    duration_seconds=duration,
                )
            finally:
                if os.path.exists(tmp_dir):
                    shutil.rmtree(tmp_dir)

        @web_app.get("/health")
        def health():
            return {
                "status": "ok",
                "mode": self.mode,
                "service": "mimic-talking-avatar",
            }

        return web_app

    # ----------------------------------------------------------------
    # Modal method (for programmatic / local-entrypoint calls)
    # ----------------------------------------------------------------
    @modal.method()
    def generate_video(self, req_dict: dict) -> dict:
        req = AvatarRequest(**req_dict)
        resp = self._generate(req)
        return resp.model_dump()


# ===================================================================
# Local entrypoint for quick testing
# ===================================================================
@app.local_entrypoint()
def test(
    photo_key: str = "avatars/system/sample.png",
    audio_key: str = "voices/system/default.wav",
    output_key: str = "videos/test/output.mp4",
):
    avatar = TalkingAvatar()
    result = avatar.generate_video.remote(
        {
            "photo_r2_key": photo_key,
            "audio_r2_key": audio_key,
            "output_r2_key": output_key,
            "transcript": "",
        }
    )
    print(f"Done! output_r2_key={result['output_r2_key']}  "
          f"duration={result['duration_seconds']}s")
