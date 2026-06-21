import modal
import os
from typing import Optional
import tempfile

# Modal app setup  
app = modal.App("flux-inference")

# Container image with inference dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install([
        "torch>=2.0.0",
        "torchvision",
        "transformers>=4.30.0", 
        "diffusers>=0.21.0",
        "peft>=0.5.0",
        "accelerate>=0.21.0",
        "Pillow>=9.5.0",
        "boto3>=1.28.0",
        "requests>=2.31.0",
        "safetensors>=0.3.0",
    ])
    .apt_install(["git", "wget", "curl"])
)

@app.function(
    image=image,
    gpu="A100",
    timeout=300,  # 5 minute timeout
    secrets=[
        modal.Secret.from_name("cloudflare-r2"),
        modal.Secret.from_name("hf-token")
    ]
)
def generate_image(
    prompt: str,
    lora_weights_r2_key: Optional[str] = None,
    width: int = 768,
    height: int = 1024,
    num_inference_steps: int = 4,
    guidance_scale: float = 0.0,
    seed: Optional[int] = None
) -> dict:
    """Generate image with Flux, optionally using LoRA weights"""
    import boto3
    import torch
    from diffusers import FluxPipeline
    from peft import PeftModel
    import io
    from PIL import Image
    
    # Setup R2 client
    s3 = boto3.client(
        's3',
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
        region_name='auto'
    )
    
    try:
        # Load base Flux model
        pipe = FluxPipeline.from_pretrained(
            "black-forest-labs/FLUX.1-schnell",
            torch_dtype=torch.bfloat16,
            use_auth_token=os.environ.get('HUGGINGFACE_TOKEN')
        )
        pipe = pipe.to("cuda")
        
        # Load LoRA weights if provided
        if lora_weights_r2_key:
            print(f"Loading LoRA weights from: {lora_weights_r2_key}")
            
            # Download LoRA weights
            with tempfile.NamedTemporaryFile(suffix='.safetensors', delete=False) as tmp_weights:
                s3.download_file(os.environ['R2_BUCKET_NAME'], lora_weights_r2_key, tmp_weights.name)
                
                # Load LoRA weights into model
                pipe.load_lora_weights(tmp_weights.name)
                print("LoRA weights loaded successfully")
        
        # Set random seed if provided
        if seed is not None:
            torch.manual_seed(seed)
        
        # Generate image
        print(f"Generating image with prompt: {prompt}")
        with torch.inference_mode():
            result = pipe(
                prompt=prompt,
                width=width,
                height=height,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                generator=torch.Generator().manual_seed(seed) if seed else None
            )
        
        # Save generated image
        generated_image = result.images[0]
        
        # Upload to R2
        img_buffer = io.BytesIO()
        generated_image.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        # Generate unique filename
        import uuid
        image_id = str(uuid.uuid4())
        image_r2_key = f"generated/{image_id}.png"
        
        s3.upload_fileobj(
            img_buffer,
            os.environ['R2_BUCKET_NAME'],
            image_r2_key,
            ExtraArgs={'ContentType': 'image/png'}
        )
        
        return {
            "status": "completed",
            "image_r2_key": image_r2_key,
            "prompt": prompt,
            "width": width,
            "height": height,
            "seed": seed,
            "lora_used": lora_weights_r2_key is not None
        }
        
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e),
            "message": f"Image generation failed: {str(e)}"
        }

@app.function(image=image, timeout=60)
def health_check() -> dict:
    """Health check endpoint"""
    return {"status": "healthy", "service": "flux-inference"}

# FastAPI web interface
@app.asgi_app()
def web():
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
    
    class GenerateRequest(BaseModel):
        prompt: str
        lora_weights_r2_key: Optional[str] = None
        width: int = 768
        height: int = 1024
        num_inference_steps: int = 4
        guidance_scale: float = 0.0
        seed: Optional[int] = None
    
    app = FastAPI(title="Flux Inference with LoRA")
    
    @app.get("/health")
    def health():
        return health_check.remote()
    
    @app.post("/generate")
    def generate(request: GenerateRequest):
        try:
            result = generate_image.remote(
                prompt=request.prompt,
                lora_weights_r2_key=request.lora_weights_r2_key,
                width=request.width,
                height=request.height,
                num_inference_steps=request.num_inference_steps,
                guidance_scale=request.guidance_scale,
                seed=request.seed
            )
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    return app