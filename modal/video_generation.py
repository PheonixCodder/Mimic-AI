"""
Mimic AI — Wan2 Video Generation (GPU)

Deploy (no env var needed):
  modal deploy modal/video_generation.py

For CPU/OpenCV simulate clips, use modal/video_generation_simulate.py instead.
"""

from __future__ import annotations

import modal

R2_BUCKET = "mimic-ai"
R2_ACCOUNT_ID = "aea0e987f8b0fcd0ed0c572a84d95622"
R2_MOUNT_PATH = "/r2"
WAN2_MODEL_ID = "Wan-AI/Wan2.1-T2V-1.3B-Diffusers"
WAN2_MODEL_DIR = "/models/wan2"

r2_secret = modal.Secret.from_name("cloudflare-r2")
api_key_secret = modal.Secret.from_name("mimic-api-key")
hf_secret = modal.Secret.from_name("hf-token")

r2_mount = modal.CloudBucketMount(
    bucket_name=R2_BUCKET,
    bucket_endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    secret=r2_secret,
    read_only=False,
)

wan2_volume = modal.Volume.from_name("wan2-cache", create_if_missing=True)


def download_wan2_models():
    from huggingface_hub import snapshot_download

    snapshot_download(WAN2_MODEL_ID, local_dir=WAN2_MODEL_DIR)


wan2_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.1.1-devel-ubuntu22.04",
        add_python="3.11",
    )
    .env({"DEBIAN_FRONTEND": "noninteractive"})
    .apt_install("ffmpeg", "git", "libgl1")
    .pip_install(
        "torch==2.4.1",
        "torchvision",
        "diffusers>=0.33.0",
        "transformers>=4.49.0",
        "accelerate",
        "huggingface_hub",
        "imageio[ffmpeg]",
        "fastapi[standard]",
        "pydantic",
        "numpy",
        "sentencepiece",
        "protobuf",
    )
    .run_function(
        download_wan2_models,
        volumes={"/models": wan2_volume},
        secrets=[hf_secret],
    )
)

app = modal.App("mimic-video-generation", image=wan2_image)

with wan2_image.imports():
    import os
    import subprocess
    import tempfile

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

    def _wan2_dimensions(aspect_ratio: str) -> tuple[int, int]:
        mapping = {
            "16:9": (832, 480),
            "9:16": (480, 832),
            "1:1": (480, 480),
        }
        return mapping.get(aspect_ratio, (832, 480))

    def _wan2_num_frames(duration_seconds: int) -> int:
        fps = 16
        duration = max(3, min(duration_seconds, 15))
        frames = duration * fps + 1
        return max(33, min(frames, 129))

    STYLE_PREFIXES = {
        "cinematic": "cinematic film shot, ",
        "animated": "animated cartoon style, ",
        "abstract": "abstract artistic visuals, ",
        "nature": "nature documentary footage, ",
        "minimal": "minimal clean aesthetic, ",
    }

    WAN2_NEGATIVE_PROMPT = (
        "Bright tones, overexposed, static, blurred details, subtitles, style, works, "
        "paintings, images, static, overall gray, worst quality, low quality, "
        "JPEG compression residue, ugly, incomplete, extra fingers, poorly drawn hands, "
        "poorly drawn faces, deformed, disfigured, misshapen limbs, fused fingers, "
        "still picture, messy background, three legs, many people in the background, "
        "walking backwards"
    )

    def _watermark_font_size(size: str, height: int) -> int:
        scale = {"small": 14, "medium": 20, "large": 28}.get(size, 20)
        return max(12, int(scale * (height / 480.0)))

    def _watermark_logo_scale(size: str) -> float:
        return {"small": 0.10, "medium": 0.15, "large": 0.22}.get(size, 0.15)

    def _watermark_overlay_position(position: str, margin: int = 20) -> tuple[str, str]:
        mapping = {
            "top-left": (str(margin), str(margin)),
            "top-right": (f"main_w-overlay_w-{margin}", str(margin)),
            "bottom-left": (str(margin), f"main_h-overlay_h-{margin}"),
            "bottom-right": (f"main_w-overlay_w-{margin}", f"main_h-overlay_h-{margin}"),
        }
        return mapping.get(position, mapping["bottom-right"])

    def _escape_drawtext(text: str) -> str:
        return (
            text.replace("\\", "\\\\")
            .replace(":", "\\:")
            .replace("'", "\\'")
            .replace("%", "\\%")
        )

    def _apply_watermark_ffmpeg(
        input_path: str, output_path: str, req: ClipRequest, width: int, height: int
    ) -> None:
        if not req.watermark_enabled:
            subprocess.run(
                ["ffmpeg", "-y", "-i", input_path, "-c", "copy", output_path],
                capture_output=True,
                check=True,
            )
            return

        margin = 20
        opacity = max(0.1, min(1.0, float(req.watermark_opacity)))
        logo_path = (
            f"{R2_MOUNT_PATH}/{req.watermark_logo_key}"
            if req.watermark_type == "logo" and req.watermark_logo_key
            else None
        )
        has_logo = bool(logo_path and os.path.exists(logo_path))

        if has_logo:
            logo_scale = _watermark_logo_scale(req.watermark_size)
            overlay_x, overlay_y = _watermark_overlay_position(req.watermark_position, margin)
            filter_complex = ";".join(
                [
                    f"[1:v]scale=iw*{logo_scale}:-1,format=rgba,colorchannelmixer=aa={opacity}[logo]",
                    f"[0:v][logo]overlay={overlay_x}:{overlay_y}[vout]",
                ]
            )
            cmd = [
                "ffmpeg", "-y", "-i", input_path, "-i", logo_path,
                "-filter_complex", filter_complex, "-map", "[vout]", "-map", "0:a?",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac",
                output_path,
            ]
        else:
            wm_size = _watermark_font_size(req.watermark_size, height)
            x_expr, y_expr = {
                "top-left": (str(margin), str(margin)),
                "top-right": (f"w-tw-{margin}", str(margin)),
                "bottom-left": (str(margin), f"h-th-{margin}"),
                "bottom-right": (f"w-tw-{margin}", f"h-th-{margin}"),
            }.get(req.watermark_position, (f"w-tw-{margin}", f"h-th-{margin}"))
            escaped_text = _escape_drawtext(req.watermark_text or "mimic.ai")
            vf = (
                f"drawtext=text='{escaped_text}':x={x_expr}:y={y_expr}:"
                f"fontsize={wm_size}:fontcolor=white@{opacity}"
            )
            cmd = [
                "ffmpeg", "-y", "-i", input_path, "-vf", vf,
                "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac",
                output_path,
            ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(
                f"FFmpeg watermark failed:\nSTDOUT: {result.stdout}\nSTDERR: {result.stderr}"
            )

    api_key_header = APIKeyHeader(name="X-Api-Key", auto_error=False)

    def _make_verify_api_key(api_key: str):
        async def verify_api_key(key: str = Security(api_key_header)):
            if key != api_key:
                raise HTTPException(status_code=401, detail="Invalid API key")

        return verify_api_key


@app.cls(
    image=wan2_image,
    gpu="A100-40GB",
    secrets=[r2_secret, api_key_secret, hf_secret],
    volumes={R2_MOUNT_PATH: r2_mount, "/models": wan2_volume},
    scaledown_window=60 * 5,
    timeout=1800,
)
@modal.concurrent(max_inputs=2)
class VideoGeneration:
    @modal.enter()
    def setup(self):
        self.mode = "wan2"
        self._api_key = os.environ.get("MIMIC_API_KEY", "")
        self._verify = _make_verify_api_key(self._api_key)
        self.pipe = None

    def _ensure_wan2_pipe(self):
        if self.pipe is not None:
            return

        import torch
        from diffusers import AutoencoderKLWan, WanPipeline

        model_source = WAN2_MODEL_DIR if os.path.isdir(WAN2_MODEL_DIR) else WAN2_MODEL_ID
        vae = AutoencoderKLWan.from_pretrained(
            model_source, subfolder="vae", torch_dtype=torch.float32
        )
        self.pipe = WanPipeline.from_pretrained(
            model_source, vae=vae, torch_dtype=torch.bfloat16
        )
        self.pipe.to("cuda")
        print(f"[VideoGeneration] Wan2 pipeline loaded from {model_source}")

    def _generate_clip(self, req: ClipRequest) -> ClipResponse:
        self._ensure_wan2_pipe()
        from diffusers.utils import export_to_video

        width, height = _wan2_dimensions(req.aspect_ratio)
        num_frames = _wan2_num_frames(req.duration_seconds)
        fps = 16
        duration = (num_frames - 1) / fps
        style_prefix = STYLE_PREFIXES.get(req.style, STYLE_PREFIXES["cinematic"])
        prompt = f"{style_prefix}{req.prompt.strip()}"

        output = self.pipe(
            prompt=prompt,
            negative_prompt=WAN2_NEGATIVE_PROMPT,
            width=width,
            height=height,
            num_frames=num_frames,
            guidance_scale=5.0,
        )
        frames = output.frames[0]

        with tempfile.TemporaryDirectory() as tmp:
            raw_path = os.path.join(tmp, "raw.mp4")
            out_path = os.path.join(tmp, "output.mp4")
            export_to_video(frames, raw_path, fps=fps)
            _apply_watermark_ffmpeg(raw_path, out_path, req, width, height)

            r2_dest = f"{R2_MOUNT_PATH}/{req.output_r2_key}"
            os.makedirs(os.path.dirname(r2_dest), exist_ok=True)
            with open(out_path, "rb") as src, open(r2_dest, "wb") as dst:
                dst.write(src.read())

        return ClipResponse(
            output_r2_key=req.output_r2_key,
            duration_seconds=float(duration),
            width=width,
            height=height,
        )

    @modal.asgi_app()
    def web(self):
        verify = self._verify
        fast_app = FastAPI(title="Mimic Video Generation", version="1.0.0")

        @fast_app.get("/health")
        async def health():
            return {"status": "ok", "mode": self.mode}

        @fast_app.post("/generate", response_model=ClipResponse, dependencies=[Depends(verify)])
        async def generate(req: ClipRequest):
            return self._generate_clip(req)

        @fast_app.post("/preview", response_model=ClipResponse, dependencies=[Depends(verify)])
        async def preview(req: ClipRequest):
            short = req.model_copy(update={"duration_seconds": 3})
            return self._generate_clip(short)

        @fast_app.post("/validate", response_model=ValidateResponse, dependencies=[Depends(verify)])
        async def validate(req: ValidateRequest):
            if len(req.prompt.strip()) < 5:
                return ValidateResponse(valid=False, message="Prompt is too short")
            return ValidateResponse(valid=True, message="Prompt looks good")

        return fast_app


@app.local_entrypoint()
def test(
    prompt: str = "A beautiful sunset over the ocean",
    style: str = "cinematic",
    output_key: str = "clips/test/output.mp4",
):
    gen = VideoGeneration()
    req = ClipRequest(
        prompt=prompt,
        style=style,
        duration_seconds=5,
        aspect_ratio="16:9",
        output_r2_key=output_key,
    )
    result = gen._generate_clip.remote(req)
    print(f"Generated: {result}")
