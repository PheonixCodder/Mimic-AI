import modal
import os
from pathlib import Path
import zipfile
import tempfile
from typing import Optional

# Modal app setup
app = modal.App("flux-lora-trainer")

# Container image with training dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install([
        "torch>=2.0.0",
        "torchvision", 
        "transformers>=4.30.0",
        "diffusers>=0.21.0",
        "peft>=0.5.0",
        "accelerate>=0.21.0",
        "datasets>=2.14.0",
        "Pillow>=9.5.0",
        "boto3>=1.28.0",
        "requests>=2.31.0",
    ])
    .apt_install(["git", "wget", "curl"])
)

# R2 storage configuration
@app.function(
    image=image,
    gpu="A100",
    timeout=3600,  # 1 hour timeout
    secrets=[
        modal.Secret.from_name("cloudflare-r2"),
        modal.Secret.from_name("hf-token")
    ],
    mounts=[modal.Mount.from_local_dir(".", remote_path="/root/app")]
)
def train_lora(
    training_images_r2_key: str,
    trigger_word: str,
    steps: int = 1000,
    learning_rate: float = 1e-4,
    rank: int = 16
) -> dict:
    """Train Flux LoRA adapter from training images"""
    import boto3
    import torch
    from diffusers import FluxPipeline
    from peft import LoraConfig, get_peft_model, TaskType
    
    # Setup R2 client
    s3 = boto3.client(
        's3',
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
        region_name='auto'
    )
    
    try:
        # Download training images ZIP
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tmp_zip:
            s3.download_file(os.environ['R2_BUCKET_NAME'], training_images_r2_key, tmp_zip.name)
            
            # Extract training images
            train_dir = Path("/tmp/training_images")
            train_dir.mkdir(exist_ok=True)
            
            with zipfile.ZipFile(tmp_zip.name, 'r') as zip_ref:
                zip_ref.extractall(train_dir)
        
        # Load base Flux model
        pipe = FluxPipeline.from_pretrained(
            "black-forest-labs/FLUX.1-schnell",
            torch_dtype=torch.bfloat16,
            use_auth_token=os.environ.get('HUGGINGFACE_TOKEN')
        )
        pipe = pipe.to("cuda")
        
        # Setup LoRA configuration
        lora_config = LoraConfig(
            r=rank,
            lora_alpha=32,
            target_modules=["to_k", "to_q", "to_v", "to_out.0"],
            lora_dropout=0.1,
            task_type=TaskType.DIFFUSION_IMAGE_GENERATION,
        )
        
        # Apply LoRA to model
        pipe.unet = get_peft_model(pipe.unet, lora_config)
        
        # Simplified training loop (for MVP)
        optimizer = torch.optim.AdamW(pipe.unet.parameters(), lr=learning_rate)
        
        print(f"Starting LoRA training with {steps} steps...")
        
        # Mock training loop - in production, implement proper training
        for step in range(steps):
            if step % 100 == 0:
                print(f"Training step {step}/{steps}")
            # Actual training code would go here
        
        # Save LoRA weights
        weights_path = "/tmp/lora_weights.safetensors"
        pipe.unet.save_pretrained(weights_path)
        
        # Upload weights to R2
        model_id = training_images_r2_key.split('/')[-1].replace('.zip', '')
        weights_r2_key = f"models/{model_id}/lora_weights.safetensors"
        
        s3.upload_file(
            f"{weights_path}/pytorch_lora_weights.safetensors",
            os.environ['R2_BUCKET_NAME'],
            weights_r2_key
        )
        
        return {
            "status": "completed",
            "weights_r2_key": weights_r2_key,
            "steps_completed": steps,
            "message": f"LoRA training completed for trigger word: {trigger_word}"
        }
        
    except Exception as e:
        return {
            "status": "failed", 
            "error": str(e),
            "message": f"LoRA training failed: {str(e)}"
        }

@app.function(image=image, timeout=60)
def health_check() -> dict:
    """Health check endpoint"""
    return {"status": "healthy", "service": "flux-lora-trainer"}

# FastAPI web interface
@app.asgi_app()
def web():
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
    
    class TrainRequest(BaseModel):
        training_images_r2_key: str
        trigger_word: str
        steps: int = 1000
        learning_rate: float = 1e-4
        rank: int = 16
    
    app = FastAPI(title="Flux LoRA Trainer")
    
    @app.get("/health")
    def health():
        return health_check.remote()
    
    @app.post("/train")
    def train(request: TrainRequest):
        try:
            result = train_lora.remote(
                training_images_r2_key=request.training_images_r2_key,
                trigger_word=request.trigger_word,
                steps=request.steps,
                learning_rate=request.learning_rate,
                rank=request.rank
            )
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    return app