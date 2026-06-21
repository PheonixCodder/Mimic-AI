"""
Mimic AI — Video Composition Modal App
Compiles base videos with subtitle tracks, watermarks, scaling, and format transcoding.

Modes (controlled by VIDEO_COMP_MODE env var):
  simulate (default) — Copies base video, no video transcoding required
  moviepy            — Real native FFmpeg composition (efficient scale, burn, transcode)
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
# Modal Images
# ---------------------------------------------------------------------------

simulate_image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "fastapi[standard]",
        "pydantic",
        "numpy",
    )
)

moviepy_image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "fastapi[standard]",
        "pydantic",
        "numpy",
    )
    .apt_install("ffmpeg")
)

import os as _os
VIDEO_COMP_MODE = _os.environ.get("VIDEO_COMP_MODE", "moviepy")
active_image = moviepy_image if VIDEO_COMP_MODE == "moviepy" else simulate_image

app = modal.App("mimic-video-composition", image=active_image)

# ---------------------------------------------------------------------------
# Core Implementation
# ---------------------------------------------------------------------------

with active_image.imports():
    import os
    import subprocess
    import tempfile
    from fastapi import Depends, FastAPI, HTTPException, Security
    from fastapi.security.api_key import APIKeyHeader
    from pydantic import BaseModel

    # ---- Pydantic models ---------------------------------------------------

    class SubtitleCue(BaseModel):
        start: float
        end: float
        text: str

    class ComposeRequest(BaseModel):
        video_r2_key: str
        subtitles: list[SubtitleCue] | None = None
        watermark_enabled: bool = True
        watermark_text: str = "mimic.ai"
        watermark_type: str = "text"
        watermark_position: str = "bottom-right"
        watermark_opacity: float = 0.4
        watermark_size: str = "medium"
        watermark_logo_key: str | None = None
        resolution: str = "1080p"  # 720p, 1080p, 4k
        aspect_ratio: str = "16:9"  # 16:9, 9:16, 1:1
        format: str = "mp4"  # mp4, webm
        output_r2_key: str

    class ComposeResponse(BaseModel):
        output_r2_key: str
        duration_seconds: float
        width: int
        height: int

    # ---- Auth helper -------------------------------------------------------

    api_key_header = APIKeyHeader(name="X-Api-Key", auto_error=False)

    def _make_verify_api_key(api_key: str):
        async def verify_api_key(key: str = Security(api_key_header)):
            if key != api_key:
                raise HTTPException(status_code=401, detail="Invalid API key")
        return verify_api_key

    # ---- Dimensions helper -------------------------------------------------

    def _dimensions(resolution: str, aspect_ratio: str) -> tuple[int, int]:
        if resolution == "4k":
            mapping = {"16:9": (3840, 2160), "9:16": (2160, 3840), "1:1": (2160, 2160)}
        elif resolution == "720p":
            mapping = {"16:9": (1280, 720), "9:16": (720, 1280), "1:1": (720, 720)}
        else:  # 1080p
            mapping = {"16:9": (1920, 1080), "9:16": (1080, 1920), "1:1": (1080, 1080)}
        return mapping.get(aspect_ratio, mapping["16:9"])

    # ---- SRT formatting helper ---------------------------------------------

    def _format_time_srt(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int((seconds % 1) * 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    def _watermark_font_size(size: str, height: int) -> int:
        scale = {"small": 14, "medium": 20, "large": 28}.get(size, 20)
        return max(12, int(scale * (height / 1080.0)))

    def _watermark_logo_scale(size: str, width: int) -> float:
        ratio = {"small": 0.10, "medium": 0.15, "large": 0.22}.get(size, 0.15)
        return max(0.08, ratio)

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


# ---------------------------------------------------------------------------
# Modal Serverless Class
# ---------------------------------------------------------------------------

@app.cls(
    image=active_image,
    secrets=[r2_secret, api_key_secret],
    volumes={"/r2": r2_mount},
    scaledown_window=60 * 5,
    timeout=600,
)
@modal.concurrent(max_inputs=4)
class VideoComposition:
    @modal.enter()
    def setup(self):
        self._api_key = os.environ.get("MIMIC_API_KEY", "")
        self._verify = _make_verify_api_key(self._api_key)

    def _compose_video(self, req: ComposeRequest) -> ComposeResponse:
        input_path = f"/r2/{req.video_r2_key}"
        output_path = f"/r2/{req.output_r2_key}"

        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Source video not found in R2 mount: {req.video_r2_key}")

        w, h = _dimensions(req.resolution, req.aspect_ratio)

        if VIDEO_COMP_MODE == "moviepy":
            # Real Native FFmpeg compilation
            with tempfile.TemporaryDirectory() as tmp_dir:
                srt_path = os.path.join(tmp_dir, "subtitles.srt")
                out_local = os.path.join(tmp_dir, f"out.{req.format}")

                # 1. Generate SRT file if subtitles are provided
                has_subs = req.subtitles and len(req.subtitles) > 0
                if has_subs:
                    with open(srt_path, "w", encoding="utf-8") as f:
                        for idx, cue in enumerate(req.subtitles):
                            f.write(f"{idx + 1}\n")
                            f.write(f"{_format_time_srt(cue.start)} --> {_format_time_srt(cue.end)}\n")
                            f.write(f"{cue.text}\n\n")

                # 2. Build FFmpeg filter chain
                margin = 20
                opacity = max(0.1, min(1.0, float(req.watermark_opacity)))
                logo_path = (
                    f"/r2/{req.watermark_logo_key}"
                    if req.watermark_enabled
                    and req.watermark_type == "logo"
                    and req.watermark_logo_key
                    else None
                )
                has_logo = bool(logo_path and os.path.exists(logo_path))

                if has_logo:
                    filter_parts = [f"[0:v]scale={w}:{h}[scaled]"]
                    current_label = "scaled"

                    if has_subs:
                        escaped_srt = srt_path.replace("\\", "/").replace(":", "\\:")
                        font_size = int(24 * (h / 1080.0))
                        filter_parts.append(
                            f"[{current_label}]subtitles='{escaped_srt}':force_style='FontSize={font_size},Alignment=2,OutlineColour=&H80000000,BorderStyle=3'[vsub]"
                        )
                        current_label = "vsub"

                    logo_scale = _watermark_logo_scale(req.watermark_size, w)
                    overlay_x, overlay_y = _watermark_overlay_position(req.watermark_position, margin)
                    filter_parts.append(
                        f"[1:v]scale=iw*{logo_scale}:-1,format=rgba,colorchannelmixer=aa={opacity}[logo]"
                    )
                    filter_parts.append(
                        f"[{current_label}][logo]overlay={overlay_x}:{overlay_y}[vout]"
                    )
                    filter_complex = ";".join(filter_parts)

                    codec_args = []
                    if req.format == "webm":
                        codec_args = ["-c:v", "libvpx-vp9", "-b:v", "1500k", "-c:a", "libopus"]
                    else:
                        codec_args = ["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac"]

                    ffmpeg_cmd = [
                        "ffmpeg", "-y",
                        "-i", input_path,
                        "-i", logo_path,
                        "-filter_complex", filter_complex,
                        "-map", "[vout]",
                        "-map", "0:a?",
                        *codec_args,
                        out_local,
                    ]
                else:
                    filters = [f"scale={w}:{h}"]

                    if has_subs:
                        escaped_srt = srt_path.replace("\\", "/").replace(":", "\\:")
                        font_size = int(24 * (h / 1080.0))
                        filters.append(
                            f"subtitles='{escaped_srt}':force_style='FontSize={font_size},Alignment=2,OutlineColour=&H80000000,BorderStyle=3'"
                        )

                    if req.watermark_enabled and req.watermark_type == "text":
                        wm_size = _watermark_font_size(req.watermark_size, h)
                        x_expr, y_expr = {
                            "top-left": (str(margin), str(margin)),
                            "top-right": (f"w-tw-{margin}", str(margin)),
                            "bottom-left": (str(margin), f"h-th-{margin}"),
                            "bottom-right": (f"w-tw-{margin}", f"h-th-{margin}"),
                        }.get(req.watermark_position, (f"w-tw-{margin}", f"h-th-{margin}"))
                        escaped_text = _escape_drawtext(req.watermark_text)
                        filters.append(
                            f"drawtext=text='{escaped_text}':x={x_expr}:y={y_expr}:fontsize={wm_size}:fontcolor=white@{opacity}"
                        )

                    vf_chain = ",".join(filters)

                    codec_args = []
                    if req.format == "webm":
                        codec_args = ["-c:v", "libvpx-vp9", "-b:v", "1500k", "-c:a", "libopus"]
                    else:
                        codec_args = ["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac"]

                    ffmpeg_cmd = [
                        "ffmpeg", "-y",
                        "-i", input_path,
                        "-vf", vf_chain,
                        *codec_args,
                        out_local,
                    ]

                # Run FFmpeg transcode
                result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    raise RuntimeError(f"FFmpeg render failed:\nSTDOUT: {result.stdout}\nSTDERR: {result.stderr}")

                # 4. Copy completed file to writeable R2 mount destination
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                with open(out_local, "rb") as sf:
                    data = sf.read()
                with open(output_path, "wb") as df:
                    df.write(data)
        else:
            # Simulated mode fallback (quickly copies input video to export path)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(input_path, "rb") as sf:
                data = sf.read()
            with open(output_path, "wb") as df:
                df.write(data)

        # Estimate duration by reading metadata or defaulting to 5s
        duration = 5.0
        try:
            if VIDEO_COMP_MODE == "moviepy":
                # Get duration using ffprobe
                ffprobe_cmd = [
                    "ffprobe", "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    input_path
                ]
                probe_res = subprocess.run(ffprobe_cmd, capture_output=True, text=True)
                if probe_res.returncode == 0:
                    duration = float(probe_res.stdout.strip())
        except Exception:
            pass

        return ComposeResponse(
            output_r2_key=req.output_r2_key,
            duration_seconds=duration,
            width=w,
            height=h,
        )

    @modal.asgi_app()
    def web(self):
        verify = self._verify
        fast_app = FastAPI(title="Mimic Video Composition", version="1.0.0")

        @fast_app.get("/health")
        async def health():
            return {"status": "ok", "mode": VIDEO_COMP_MODE}

        @fast_app.post(
            "/compose",
            response_model=ComposeResponse,
            dependencies=[Depends(verify)],
        )
        async def compose(req: ComposeRequest):
            try:
                return self._compose_video(req)
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        return fast_app


# ---------------------------------------------------------------------------
# Local entrypoint for testing
# ---------------------------------------------------------------------------

@app.local_entrypoint()
def test(
    video_key: str = "videos/test/output.mp4",
    output_key: str = "exports/test/composite.mp4",
):
    gen = VideoComposition()
    cues = [
        SubtitleCue(start=0.5, end=2.5, text="Hello world! This is a programmatic test."),
        SubtitleCue(start=2.6, end=5.0, text="Final video rendering is working on serverless Modal.")
    ]
    req = ComposeRequest(
        video_r2_key=video_key,
        subtitles=cues,
        watermark_enabled=True,
        resolution="1080p",
        format="mp4",
        output_r2_key=output_key,
    )
    try:
        result = gen._compose_video.remote(req)
        print(f"Video composition finished successfully!")
        print(f"Resolution: {result.width}x{result.height}, Duration: {result.duration_seconds}s")
        print(f"R2 key: {result.output_r2_key}")
    except Exception as e:
        print(f"Video composition failed: {e}")
