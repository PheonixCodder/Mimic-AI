import { logger, task, metadata, tasks } from "@trigger.dev/sdk/v3";
import { createAdminClient } from "@insforge/sdk";
import { Polar } from "@polar-sh/sdk";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export type RunJobPayload = {
  jobId: string;
};

type JobType =
  | "video_render"
  | "voice_clone"
  | "voice_validate"
  | "avatar_generate"
  | "avatar_validate"
  | "video_export"
  | "caption_generate"
  | "video_preview"
  | "clip_generate"
  | "model_finetune";

type JobStage = {
  name: string;
  progress: number;
};

const STAGES: Record<JobType, JobStage[]> = {
  video_render: [
    { name: "validating_inputs", progress: 15 },
    { name: "generating_speech", progress: 40 },
    { name: "rendering_avatar", progress: 70 },
    { name: "combining_tracks", progress: 90 },
    { name: "uploading_r2", progress: 95 },
  ],
  video_preview: [
    { name: "generating_preview_speech", progress: 30 },
    { name: "rendering_preview", progress: 70 },
    { name: "uploading_preview", progress: 90 },
  ],
  voice_clone: [
    { name: "generating_speech", progress: 30 },
    { name: "uploading_audio", progress: 70 },
    { name: "completed", progress: 100 },
  ],
  voice_validate: [
    { name: "downloading_audio", progress: 20 },
    { name: "analyzing_quality", progress: 60 },
    { name: "storing_results", progress: 90 },
  ],
  avatar_generate: [
    { name: "generating_image", progress: 40 },
    { name: "upscaling", progress: 70 },
    { name: "registering_avatar", progress: 90 },
  ],
  avatar_validate: [
    { name: "downloading_image", progress: 20 },
    { name: "analyzing_quality", progress: 60 },
    { name: "storing_results", progress: 90 },
  ],
  video_export: [
    { name: "rendering_video", progress: 35 },
    { name: "applying_watermark", progress: 70 },
    { name: "uploading_export", progress: 90 },
  ],
  caption_generate: [
    { name: "transcribing", progress: 40 },
    { name: "aligning_timestamps", progress: 75 },
    { name: "saving_subtitles", progress: 90 },
  ],
  clip_generate: [
    { name: "generating_clip", progress: 30 },
    { name: "rendering_frames", progress: 65 },
    { name: "compositing", progress: 85 },
    { name: "uploading_clip", progress: 95 },
  ],
  model_finetune: [
    { name: "preparing_dataset", progress: 15 },
    { name: "uploading_images", progress: 30 },
    { name: "training", progress: 70 },
    { name: "saving_weights", progress: 90 },
  ],
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const runJobTask = task({
  id: "run-job",
  maxDuration: 900,
  retry: {
    maxAttempts: 2,
    factor: 1.8,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: RunJobPayload) => {
    logger.info("Starting background job task", { jobId: payload.jobId });
    metadata.set("stage", "starting");

    const db = createAdminClient({
      baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
      apiKey: process.env.INSFORGE_API_KEY!,
    });

    // 1. Fetch job record
    const { data: job, error: fetchError } = await db.database
      .from("jobs")
      .select("*")
      .eq("id", payload.jobId)
      .single();

    if (fetchError || !job) {
      logger.error("Job not found in database", { jobId: payload.jobId, error: fetchError });
      metadata.set("stage", "failed");
      throw new Error(`Job ${payload.jobId} not found in database`);
    }

    const jobType = job.type as JobType;
    const startTime = Date.now();

    // 2. Transition status to running
    await db.database
      .from("jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        progress: 5,
      })
      .eq("id", payload.jobId);

    await tasks.trigger("send-webhook", {
      workspaceId: job.workspace_id,
      event: "job.running",
      payload: {
        jobId: job.id,
        type: job.type,
        title: job.title,
        status: "running",
        progress: 5,
        resourceId: job.resource_id,
        resourceType: job.resource_type,
      },
    });

    try {
      const isRealPipelineAvailable =
        process.env.CHATTERBOX_API_URL &&
        process.env.TALKING_AVATAR_API_URL;
      const isClipPipelineAvailable = !!process.env.VIDEO_GENERATION_API_URL;
      const isCaptionPipelineAvailable = !!process.env.CAPTION_GENERATION_API_URL;
      const isCompositionPipelineAvailable = !!process.env.VIDEO_COMPOSITION_API_URL;

      if (jobType === "video_export") {
        // --- VIDEO EXPORT / COMPOSITION ---
        const { data: exportRecord, error: exportError } = await db.database
          .from("video_exports")
          .select("*")
          .eq("id", job.resource_id)
          .single();

        if (exportError || !exportRecord) {
          throw new Error(`Export record not found: ${exportError?.message || "unknown"}`);
        }

        // Fetch the source video
        const { data: video, error: videoError } = await db.database
          .from("videos")
          .select("*")
          .eq("id", exportRecord.video_id)
          .single();

        if (videoError || !video) {
          throw new Error(`Source video not found for export: ${videoError?.message || "unknown"}`);
        }

        if (!video.r2_object_key) {
          throw new Error("Source video has no associated R2 object key");
        }

        const outputR2Key = `exports/${exportRecord.id}.${exportRecord.format}`;

        // Stage 1: rendering_video
        metadata.set("stage", "rendering_video");
        await db.database.from("jobs").update({ progress: 35 }).eq("id", payload.jobId);

        if (isCompositionPipelineAvailable) {
          let watermarkLogoKey: string | null = null;
          if (
            exportRecord.watermark_enabled &&
            exportRecord.watermark_type === "logo"
          ) {
            const { data: brandKits } = await db.database
              .from("brand_kits")
              .select("logo_key")
              .eq("workspace_id", job.workspace_id)
              .order("updated_at", { ascending: false })
              .limit(1);
            watermarkLogoKey =
              (brandKits?.[0] as { logo_key?: string | null } | undefined)
                ?.logo_key ?? null;
          }

          const composeResponse = await fetch(`${process.env.VIDEO_COMPOSITION_API_URL}/compose`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": process.env.VIDEO_COMPOSITION_API_KEY || "",
            },
            body: JSON.stringify({
              video_r2_key: video.r2_object_key,
              subtitles: video.subtitles || [],
              watermark_enabled: exportRecord.watermark_enabled,
              watermark_text: exportRecord.watermark_text || "mimic.ai",
              watermark_type: exportRecord.watermark_type || "text",
              watermark_position: exportRecord.watermark_position || "bottom-right",
              watermark_opacity: exportRecord.watermark_opacity ?? 0.4,
              watermark_size: exportRecord.watermark_size || "medium",
              watermark_logo_key: watermarkLogoKey,
              resolution: exportRecord.resolution,
              format: exportRecord.format,
              output_r2_key: outputR2Key,
            }),
          });

          if (!composeResponse.ok) {
            const errBody = await composeResponse.text().catch(() => "");
            throw new Error(`Composition API failed (${composeResponse.status}): ${errBody}`);
          }
        }

        // Stage 2: applying_watermark
        metadata.set("stage", "applying_watermark");
        await db.database.from("jobs").update({ progress: 70 }).eq("id", payload.jobId);
        await delay(800);

        // Stage 3: uploading_export
        metadata.set("stage", "uploading_export");
        await db.database.from("jobs").update({ progress: 90 }).eq("id", payload.jobId);
        await delay(800);

        // Pre-update export record with the R2 key so the completion block
        // can use the already-resolved output key
        await db.database
          .from("video_exports")
          .update({
            status: "completed",
            r2_object_key: outputR2Key,
            r2_object_url: `/api/videos/exports/${exportRecord.id}`,
          })
          .eq("id", exportRecord.id);

      } else if (jobType === "caption_generate") {
        // --- CAPTION GENERATION ---
        const { data: video, error: videoError } = await db.database
          .from("videos")
          .select("*")
          .eq("id", job.resource_id)
          .single();

        if (videoError || !video) {
          throw new Error(`Video not found for job: ${videoError?.message || "unknown"}`);
        }

        // Stage 1: transcribing
        metadata.set("stage", "transcribing");
        await db.database.from("jobs").update({ progress: 40 }).eq("id", payload.jobId);

        let subtitles = null;

        if (isCaptionPipelineAvailable) {
          const response = await fetch(`${process.env.CAPTION_GENERATION_API_URL}/transcribe`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": process.env.CAPTION_GENERATION_API_KEY || "",
            },
            body: JSON.stringify({
              video_r2_key: video.r2_object_key || video.preview_object_key,
              transcript: video.script || "",
            }),
          });

          if (!response.ok) {
            throw new Error(`Caption generation failed with status ${response.status}`);
          }

          const result = await response.json();
          subtitles = result.subtitles;
        }

        // Stage 2: aligning_timestamps
        metadata.set("stage", "aligning_timestamps");
        await db.database.from("jobs").update({ progress: 75 }).eq("id", payload.jobId);
        await delay(1000);

        // Stage 3: saving_subtitles
        metadata.set("stage", "saving_subtitles");
        await db.database.from("jobs").update({ progress: 90 }).eq("id", payload.jobId);

        // Save subtitles to videos table
        const { error: saveError } = await db.database
          .from("videos")
          .update({
            subtitles,
            subtitles_status: "completed",
            subtitles_error: null,
          })
          .eq("id", video.id);

        if (saveError) {
          throw new Error(`Failed to save subtitles: ${saveError.message}`);
        }
        await delay(1000);
      } else if (jobType === "clip_generate" && isClipPipelineAvailable) {
        // --- CLIP GENERATION ---
        const { data: clip, error: clipError } = await db.database
          .from("video_clips")
          .select("*")
          .eq("id", job.resource_id)
          .single();

        if (clipError || !clip) {
          throw new Error(`Clip not found for job: ${clipError?.message || "unknown"}`);
        }

        // Stage 1: generating_clip
        metadata.set("stage", "generating_clip");
        await db.database.from("jobs").update({ progress: 30 }).eq("id", payload.jobId);

        const outputR2Key = `clips/${job.workspace_id}/${job.resource_id}.mp4`;

        let watermarkLogoKey: string | null = null;
        if (clip.watermark_enabled && clip.watermark_type === "logo") {
          const { data: brandKits } = await db.database
            .from("brand_kits")
            .select("logo_key")
            .eq("workspace_id", job.workspace_id)
            .order("updated_at", { ascending: false })
            .limit(1);
          watermarkLogoKey =
            (brandKits?.[0] as { logo_key?: string | null } | undefined)
              ?.logo_key ?? null;
        }

        const response = await fetch(`${process.env.VIDEO_GENERATION_API_URL}/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": process.env.VIDEO_GENERATION_API_KEY || "",
          },
          body: JSON.stringify({
            prompt: clip.prompt,
            style: clip.style,
            duration_seconds: clip.duration_seconds,
            aspect_ratio: clip.aspect_ratio,
            output_r2_key: outputR2Key,
            watermark_enabled: clip.watermark_enabled ?? true,
            watermark_text: clip.watermark_text || "mimic.ai",
            watermark_type: clip.watermark_type || "text",
            watermark_position: clip.watermark_position || "bottom-right",
            watermark_opacity: clip.watermark_opacity ?? 0.4,
            watermark_size: clip.watermark_size || "medium",
            watermark_logo_key: watermarkLogoKey,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          throw new Error(`Clip generation failed (${response.status}): ${errBody}`);
        }

        // Transition progress through remaining stages
        metadata.set("stage", "rendering_frames");
        await db.database.from("jobs").update({ progress: 65 }).eq("id", payload.jobId);
        await delay(1000);

        metadata.set("stage", "compositing");
        await db.database.from("jobs").update({ progress: 85 }).eq("id", payload.jobId);
        await delay(1000);

        metadata.set("stage", "uploading_clip");
        await db.database.from("jobs").update({ progress: 95 }).eq("id", payload.jobId);
        await delay(1000);
      } else if (isRealPipelineAvailable && (jobType === "video_render" || jobType === "video_preview")) {
        // Initialize S3Client for direct R2 access
        const s3Client = new S3Client({
          region: "auto",
          endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
          },
        });

        // Fetch the video record
        const { data: video, error: videoError } = await db.database
          .from("videos")
          .select("*")
          .eq("id", job.resource_id)
          .single();

        if (videoError || !video) {
          throw new Error(`Video not found for job: ${videoError?.message || "unknown"}`);
        }

        // Fetch voice
        const { data: voice, error: voiceError } = await db.database
          .from("voices")
          .select("*")
          .eq("id", video.voice_id)
          .single();

        if (voiceError || !voice) {
          throw new Error(`Voice not found for video: ${voiceError?.message || "unknown"}`);
        }

        // Fetch avatar
        const { data: avatar, error: avatarError } = await db.database
          .from("avatars")
          .select("*")
          .eq("id", video.avatar_id)
          .single();

        if (avatarError || !avatar) {
          throw new Error(`Avatar not found for video: ${avatarError?.message || "unknown"}`);
        }

        if (!avatar.r2_object_key) {
          throw new Error("Avatar has no associated portrait image key");
        }

        // Fetch digital twin (optional — null if not configured)
        const { data: digitalTwin } = await db.database
          .from("digital_twins")
          .select("speaking_style, tone, personality, vocabulary")
          .eq("avatar_id", video.avatar_id)
          .single();

        const styleInstruction = digitalTwin
          ? [
              `Speaking style: ${(digitalTwin as any).speaking_style}.`,
              `Tone: ${(digitalTwin as any).tone}.`,
              (digitalTwin as any).personality ?? "",
              (digitalTwin as any).vocabulary ?? "",
            ].filter(Boolean).join(" ").trim()
          : undefined;

        if (jobType === "video_render") {
          // --- FULL VIDEO RENDER ---
          
          // Stage 1: Validating inputs
          metadata.set("stage", "validating_inputs");
          await db.database.from("jobs").update({ progress: 15 }).eq("id", payload.jobId);
          await delay(1000);

          // Stage 2: Generating speech
          metadata.set("stage", "generating_speech");
          await db.database.from("jobs").update({ progress: 20 }).eq("id", payload.jobId);

          const ttsResponse = await fetch(`${process.env.CHATTERBOX_API_URL}/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": process.env.CHATTERBOX_API_KEY || "",
            },
            body: JSON.stringify({
              prompt: video.script,
              voice_key: voice.r2_object_key,
              ...(styleInstruction ? { style_instruction: styleInstruction } : {}),
            }),
          });

          if (!ttsResponse.ok) {
            throw new Error(`TTS audio generation failed with status ${ttsResponse.status}`);
          }

          const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
          const audioKey = `audio/${job.workspace_id}/${job.resource_id}.wav`;

          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME!,
              Key: audioKey,
              Body: audioBuffer,
              ContentType: "audio/wav",
            }),
          );

          // Update audio key in video table
          await db.database
            .from("videos")
            .update({ audio_object_key: audioKey })
            .eq("id", video.id);

          await db.database.from("jobs").update({ progress: 40 }).eq("id", payload.jobId);

          // Stage 3: Rendering avatar
          metadata.set("stage", "rendering_avatar");
          await db.database.from("jobs").update({ progress: 50 }).eq("id", payload.jobId);

          const outputKey = `videos/${job.workspace_id}/${job.resource_id}.mp4`;

          const avatarResponse = await fetch(`${process.env.TALKING_AVATAR_API_URL}/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": process.env.TALKING_AVATAR_API_KEY || "",
            },
            body: JSON.stringify({
              photo_r2_key: avatar.r2_object_key,
              audio_r2_key: audioKey,
              output_r2_key: outputKey,
              transcript: video.script,
            }),
          });

          if (!avatarResponse.ok) {
            throw new Error(`Avatar render failed with status ${avatarResponse.status}`);
          }

          await db.database.from("jobs").update({ progress: 70 }).eq("id", payload.jobId);

          // Stage 4 & 5: Combining tracks and uploading
          // (Modal code already merges tracks and writes to outputKey, so we just transition progress)
          metadata.set("stage", "combining_tracks");
          await db.database.from("jobs").update({ progress: 90 }).eq("id", payload.jobId);
          await delay(1000);

          metadata.set("stage", "uploading_r2");
          await db.database.from("jobs").update({ progress: 95 }).eq("id", payload.jobId);
          await delay(1000);
        } else {
          // --- PREVIEW GENERATION ---

          // Stage 1: Generating preview speech
          metadata.set("stage", "generating_preview_speech");
          await db.database.from("jobs").update({ progress: 15 }).eq("id", payload.jobId);

          const previewPrompt = "Hi there, I am ready to narrate your video.";
          const ttsResponse = await fetch(`${process.env.CHATTERBOX_API_URL}/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": process.env.CHATTERBOX_API_KEY || "",
            },
            body: JSON.stringify({
              prompt: previewPrompt,
              voice_key: voice.r2_object_key,
            }),
          });

          if (!ttsResponse.ok) {
            throw new Error(`TTS preview audio generation failed with status ${ttsResponse.status}`);
          }

          const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
          const previewAudioKey = `previews/${job.resource_id}_audio.wav`;

          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME!,
              Key: previewAudioKey,
              Body: audioBuffer,
              ContentType: "audio/wav",
            }),
          );

          await db.database.from("jobs").update({ progress: 30 }).eq("id", payload.jobId);

          // Stage 2: Rendering preview
          metadata.set("stage", "rendering_preview");
          await db.database.from("jobs").update({ progress: 50 }).eq("id", payload.jobId);

          const previewVideoKey = `previews/${job.resource_id}_preview.mp4`;

          const avatarResponse = await fetch(`${process.env.TALKING_AVATAR_API_URL}/preview`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": process.env.TALKING_AVATAR_API_KEY || "",
            },
            body: JSON.stringify({
              photo_r2_key: avatar.r2_object_key,
              audio_r2_key: previewAudioKey,
              output_r2_key: previewVideoKey,
              transcript: previewPrompt,
            }),
          });

          if (!avatarResponse.ok) {
            throw new Error(`Avatar preview render failed with status ${avatarResponse.status}`);
          }

          await db.database.from("jobs").update({ progress: 70 }).eq("id", payload.jobId);

          // Stage 3: Uploading preview
          metadata.set("stage", "uploading_preview");
          await db.database.from("jobs").update({ progress: 90 }).eq("id", payload.jobId);
          await delay(1000);
        }
      } else if (jobType === "avatar_generate") {
        // --- AVATAR GENERATION (Flux with optional LoRA) ---
        const { data: avatar, error: avatarError } = await db.database
          .from("avatars")
          .select("model_variant_id, name, style")
          .eq("id", job.resource_id)
          .single();

        if (avatarError || !avatar) {
          throw new Error(`Avatar not found: ${avatarError?.message || "unknown"}`);
        }

        // Stage 1: Preparing generation
        metadata.set("stage", "preparing_generation");
        await db.database.from("jobs").update({ progress: 20 }).eq("id", payload.jobId);

        let loraWeightsUrl = null;
        if (avatar.model_variant_id) {
          const { data: modelVariant, error: mvError } = await db.database
            .from("model_variants")
            .select("r2_weights_key, trigger_word")
            .eq("id", avatar.model_variant_id)
            .single();

          if (!mvError && modelVariant?.r2_weights_key) {
            const { getPresignedDownloadUrl } = await import("../lib/r2");
            loraWeightsUrl = await getPresignedDownloadUrl(modelVariant.r2_weights_key);
          }
        }

        // Stage 2: Generating avatar image
        metadata.set("stage", "generating_image");
        await db.database.from("jobs").update({ progress: 50 }).eq("id", payload.jobId);

        const response = await fetch(`${process.env.FLUX_INFERENCE_API_URL}/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": process.env.FLUX_INFERENCE_API_KEY || "",
          },
          body: JSON.stringify({
            prompt: `professional portrait, ${avatar.style.toLowerCase()}, high quality`,
            lora_weights_r2_key: loraWeightsUrl,
            width: 768,
            height: 1024,
            num_inference_steps: 4,
          }),
        });

        if (!response.ok) {
          throw new Error(`Flux generation failed: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === "failed") {
          throw new Error(`Image generation failed: ${result.error}`);
        }

        // Stage 3: Uploading result (already done by Modal)
        metadata.set("stage", "uploading_result");
        await db.database.from("jobs").update({ progress: 90 }).eq("id", payload.jobId);
        
        // Update avatar with generated image
        await db.database.from("avatars").update({ 
          r2_object_key: result.image_r2_key,
          status: "ready" 
        }).eq("id", job.resource_id);
      } else if (jobType === "model_finetune") {
        // --- MODEL FINE-TUNE (Flux LoRA via Replicate) ---
        const { data: model, error: modelError } = await db.database
          .from("model_variants")
          .select("*")
          .eq("id", job.resource_id)
          .single();

        if (modelError || !model) {
          throw new Error(`Model variant not found: ${modelError?.message || "unknown"}`);
        }

        const mv = model as {
          id: string; name: string; trigger_word: string | null;
          training_images_r2_key: string | null; workspace_id: string;
        };

        // Stage 1: preparing dataset
        metadata.set("stage", "preparing_dataset");
        await db.database.from("jobs").update({ progress: 15 }).eq("id", payload.jobId);
        await db.database.from("model_variants").update({ status: "training" }).eq("id", mv.id);
        await delay(1000);

        // LoRA trainer not available due to Modal workspace limits
        throw new Error("Flux LoRA trainer service not available. Upgrade Modal workspace to deploy trainer service.");
      } else if (jobType === "voice_clone") {
        // --- VOICE CLONE OR VOICE VALIDATION ---
        if (!job.metadata || typeof job.metadata !== 'object') {
          throw new Error("Voice job missing required metadata");
        }

        // Check if this is a validation job
        if ('auto_validation' in job.metadata) {
          // --- VOICE VALIDATION ---
          const validationMetadata = job.metadata as {
            voice_id: string;
            voice_name: string;
            r2_object_key: string;
            language: string;
            auto_validation?: boolean;
          };

          metadata.set("stage", "downloading_audio");
          await db.database.from("jobs").update({ 
            progress: 20, 
            metadata: { ...validationMetadata, stage: "downloading_audio" }
          }).eq("id", payload.jobId);

          const { getPresignedDownloadUrl } = await import("../lib/r2");
          const audioUrl = await getPresignedDownloadUrl(validationMetadata.r2_object_key);

          const audioResponse = await fetch(audioUrl);
          if (!audioResponse.ok) {
            throw new Error(`Failed to download audio: ${audioResponse.status}`);
          }
          const audioBuffer = await audioResponse.arrayBuffer();

          metadata.set("stage", "analyzing_quality");
          await db.database.from("jobs").update({ 
            progress: 60,
            metadata: { ...validationMetadata, stage: "analyzing_quality" }
          }).eq("id", payload.jobId);

          if (!process.env.VOICE_VALIDATION_API_URL) {
            throw new Error("Voice validation service not available. API URL not configured.");
          }

          const validationResponse = await fetch(`${process.env.VOICE_VALIDATION_API_URL}/analyze`, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "X-Api-Key": process.env.VOICE_VALIDATION_API_KEY || "",
            },
            body: audioBuffer,
          });

          if (!validationResponse.ok) {
            throw new Error(`Voice validation failed: ${validationResponse.status}`);
          }

          const validationResult = await validationResponse.json();
          if (!validationResult.success) {
            throw new Error(validationResult.error || "Voice validation analysis failed");
          }

          metadata.set("stage", "storing_results");
          await db.database.from("jobs").update({ 
            progress: 90,
            metadata: { ...validationMetadata, stage: "storing_results" }
          }).eq("id", payload.jobId);

          const updateData: any = {
            quality_score: validationResult.quality_score,
            validation_results: validationResult.validation_results,
          };

          if (validationMetadata.auto_validation) {
            updateData.auto_validated_at = new Date().toISOString();
          }

          await db.database.from("voices").update(updateData).eq("id", validationMetadata.voice_id);
          await db.database.from("jobs").update({ 
            status: "completed",
            resource_id: validationMetadata.voice_id,
            resource_type: "voice",
            progress: 100,
            metadata: { ...validationMetadata, stage: "completed" }
          }).eq("id", payload.jobId);

          return;
        }

        // --- VOICE CLONE TTS GENERATION ---
        if (!job.metadata || typeof job.metadata !== 'object') {
          throw new Error("Voice clone job missing required metadata");
        }

        const voiceMetadata = job.metadata as {
          voice_id: string;
          voice_name: string;
          text: string;
          temperature?: number;
          top_p?: number;
          top_k?: number;
          repetition_penalty?: number;
          voice_r2_key?: string;
        };

        if (!voiceMetadata.voice_r2_key) {
          const { data: voice, error: voiceError } = await db.database
            .from("voices")
            .select("r2_object_key")
            .eq("id", voiceMetadata.voice_id)
            .single();

          if (voiceError || !voice?.r2_object_key) {
            throw new Error("Voice reference audio not available");
          }
          voiceMetadata.voice_r2_key = voice.r2_object_key;
        }

        const s3Client = new S3Client({
          region: "auto",
          endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
          },
        });

        metadata.set("stage", "generating_speech");
        await db.database.from("jobs").update({ progress: 30 }).eq("id", payload.jobId);

        const ttsResponse = await fetch(`${process.env.CHATTERBOX_API_URL}/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": process.env.CHATTERBOX_API_KEY || "",
          },
          body: JSON.stringify({
            prompt: voiceMetadata.text,
            voice_key: voiceMetadata.voice_r2_key,
            temperature: voiceMetadata.temperature ?? 0.8,
            top_p: voiceMetadata.top_p ?? 0.95,
            top_k: voiceMetadata.top_k ?? 1000,
            repetition_penalty: voiceMetadata.repetition_penalty ?? 1.2,
            norm_loudness: true,
          }),
        });

        if (!ttsResponse.ok) {
          const status = ttsResponse.status;
          const errorMessage = status === 400 || status === 403
            ? "Voice reference audio is unavailable"
            : `TTS generation failed with status ${status}`;
          throw new Error(errorMessage);
        }

        metadata.set("stage", "uploading_audio");
        await db.database.from("jobs").update({ progress: 70 }).eq("id", payload.jobId);

        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        const audioKey = `tts/${job.workspace_id}/${job.id}.wav`;

        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: audioKey,
            Body: audioBuffer,
            ContentType: "audio/wav",
          }),
        );

        await db.database.from("jobs").update({ 
          status: "completed",
          resource_id: audioKey,
          resource_type: "audio",
          progress: 100 
        }).eq("id", payload.jobId);
      } else if (jobType === "voice_validate") {
        // --- VOICE VALIDATION ---
        if (!job.metadata || typeof job.metadata !== 'object') {
          throw new Error("Voice validation job missing required metadata");
        }

        const validationMetadata = job.metadata as {
          voice_id: string;
          voice_name: string;
          r2_object_key: string;
          language: string;
          auto_validation?: boolean;
        };

        metadata.set("stage", "downloading_audio");
        await db.database.from("jobs").update({ 
          progress: 20, 
          metadata: { ...validationMetadata, stage: "downloading_audio" }
        }).eq("id", payload.jobId);

        const { getPresignedDownloadUrl } = await import("../lib/r2");
        const audioUrl = await getPresignedDownloadUrl(validationMetadata.r2_object_key);

        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          throw new Error(`Failed to download audio: ${audioResponse.status}`);
        }
        const audioBuffer = await audioResponse.arrayBuffer();

        metadata.set("stage", "analyzing_quality");
        await db.database.from("jobs").update({ 
          progress: 60,
          metadata: { ...validationMetadata, stage: "analyzing_quality" }
        }).eq("id", payload.jobId);

        if (!process.env.VOICE_VALIDATION_API_URL) {
          throw new Error("Voice validation service not available. API URL not configured.");
        }

        const validationResponse = await fetch(`${process.env.VOICE_VALIDATION_API_URL}/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Api-Key": process.env.VOICE_VALIDATION_API_KEY || "",
          },
          body: audioBuffer,
        });

        if (!validationResponse.ok) {
          throw new Error(`Voice validation failed: ${validationResponse.status}`);
        }

        const validationResult = await validationResponse.json();
        if (!validationResult.success) {
          throw new Error(validationResult.error || "Voice validation analysis failed");
        }

        metadata.set("stage", "storing_results");
        await db.database.from("jobs").update({ 
          progress: 90,
          metadata: { ...validationMetadata, stage: "storing_results" }
        }).eq("id", payload.jobId);

        const updateData: any = {
          quality_score: validationResult.quality_score,
          validation_results: validationResult.validation_results,
        };

        if (validationMetadata.auto_validation) {
          updateData.auto_validated_at = new Date().toISOString();
        }

        await db.database.from("voices").update(updateData).eq("id", validationMetadata.voice_id);
        await db.database.from("jobs").update({ 
          status: "completed",
          resource_id: validationMetadata.voice_id,
          resource_type: "voice",
          progress: 100,
          metadata: { ...validationMetadata, stage: "completed" }
        }).eq("id", payload.jobId);
      } else if (jobType === "avatar_validate") {
        // --- AVATAR VALIDATION ---
        if (!job.metadata || typeof job.metadata !== 'object') {
          throw new Error("Avatar validation job missing required metadata");
        }

        const validationMetadata = job.metadata as {
          avatar_id: string;
          avatar_name: string;
          r2_object_key: string;
          auto_validation?: boolean;
        };

        metadata.set("stage", "downloading_image");
        await db.database.from("jobs").update({ 
          progress: 20,
          metadata: { ...validationMetadata, stage: "downloading_image" }
        }).eq("id", payload.jobId);

        const { getPresignedDownloadUrl } = await import("../lib/r2");
        const imageUrl = await getPresignedDownloadUrl(validationMetadata.r2_object_key);

        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();

        metadata.set("stage", "analyzing_quality");
        await db.database.from("jobs").update({ 
          progress: 60,
          metadata: { ...validationMetadata, stage: "analyzing_quality" }
        }).eq("id", payload.jobId);

        if (!process.env.AVATAR_VALIDATION_API_URL) {
          throw new Error("Avatar validation service not available. API URL not configured.");
        }

        const validationResponse = await fetch(`${process.env.AVATAR_VALIDATION_API_URL}/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Api-Key": process.env.AVATAR_VALIDATION_API_KEY || "",
          },
          body: imageBuffer,
        });

        if (!validationResponse.ok) {
          throw new Error(`Avatar validation failed: ${validationResponse.status}`);
        }

        const validationResult = await validationResponse.json();
        if (!validationResult.success) {
          throw new Error(validationResult.error || "Avatar validation analysis failed");
        }

        metadata.set("stage", "storing_results");
        await db.database.from("jobs").update({ 
          progress: 90,
          metadata: { ...validationMetadata, stage: "storing_results" }
        }).eq("id", payload.jobId);

        const updateData: any = {
          readiness_score: validationResult.readiness_score,
          validation_results: validationResult.validation_results,
        };

        if (validationMetadata.auto_validation) {
          updateData.auto_validated_at = new Date().toISOString();
        }

        await db.database.from("avatars").update(updateData).eq("id", validationMetadata.avatar_id);
        await db.database.from("jobs").update({ 
          status: "completed",
          resource_id: validationMetadata.avatar_id,
          resource_type: "avatar",
          progress: 100,
          metadata: { ...validationMetadata, stage: "completed" }
        }).eq("id", payload.jobId);
      } else {
        throw new Error(`Unsupported job type: ${jobType}. All job types must have proper Modal API handlers.`);
      }
    } catch (err: any) {
      logger.error("Job execution failed", { jobId: payload.jobId, error: err });
      const errorMessage = err.message || String(err);

      await db.database
        .from("jobs")
        .update({
          status: "failed",
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        })
        .eq("id", payload.jobId);

      if (job.resource_id) {
        if (jobType === "video_render") {
          await db.database
            .from("videos")
            .update({ status: "failed" })
            .eq("id", job.resource_id);
        } else if (jobType === "video_preview") {
          await db.database
            .from("videos")
            .update({
              preview_status: "failed",
              preview_error: errorMessage,
            })
            .eq("id", job.resource_id);
        } else if (jobType === "clip_generate") {
          await db.database
            .from("video_clips")
            .update({
              status: "failed",
              error_message: errorMessage,
            })
            .eq("id", job.resource_id);
        } else if (jobType === "video_export") {
          await db.database
            .from("video_exports")
            .update({
              status: "failed",
            })
            .eq("id", job.resource_id);
        } else if (jobType === "caption_generate") {
          await db.database
            .from("videos")
            .update({
              subtitles_status: "failed",
              subtitles_error: errorMessage,
            })
            .eq("id", job.resource_id);
        } else if (jobType === "model_finetune") {
          await db.database
            .from("model_variants")
            .update({ status: "failed", error_message: errorMessage })
            .eq("id", job.resource_id);
        }
      }

      await tasks.trigger("send-webhook", {
        workspaceId: job.workspace_id,
        event: "job.failed",
        payload: {
          jobId: job.id,
          type: job.type,
          title: job.title,
          status: "failed",
          progress: job.progress,
          errorMessage,
          durationMs: Date.now() - startTime,
          resourceId: job.resource_id,
          resourceType: job.resource_type,
        },
      });

      metadata.set("stage", "failed");
      throw err;
    }

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    // 5. Synchronize specialized tables on completion
    // Note: video_export record is updated inside the execution block above
    // to avoid duplicate DB updates on completion. Skip the generic sync here.

    if (jobType === "video_render" && job.resource_id) {
      await db.database
        .from("videos")
        .update({
          status: "completed",
          r2_object_key: `videos/${job.workspace_id}/${job.resource_id}.mp4`,
        })
        .eq("id", job.resource_id);

      // Ingest video_generation meter — fire-and-forget
      if (process.env.POLAR_ACCESS_TOKEN) {
        const polarClient = new Polar({
          accessToken: process.env.POLAR_ACCESS_TOKEN,
          server: (process.env.POLAR_SERVER ?? "sandbox") as "sandbox" | "production",
        });
        polarClient.events
          .ingest({
            events: [
              {
                name: process.env.POLAR_METER_VIDEO ?? "video_generation",
                externalCustomerId: job.workspace_id,
                metadata: {
                  [process.env.POLAR_METER_VIDEO_PROPERTY ?? "compute_units"]: 1,
                },
              },
            ],
          })
          .catch((err: unknown) =>
            logger.warn("[Polar] video_generation meter ingest failed", { err }),
          );
      }
    }

    if (jobType === "video_preview" && job.resource_id) {
      await db.database
        .from("videos")
        .update({
          preview_status: "completed",
          preview_object_key: `previews/${job.resource_id}_preview.mp4`,
          preview_error: null,
        })
        .eq("id", job.resource_id);
    }

    if (jobType === "clip_generate" && job.resource_id) {
      await db.database
        .from("video_clips")
        .update({
          status: "completed",
          r2_object_key: `clips/${job.workspace_id}/${job.resource_id}.mp4`,
        })
        .eq("id", job.resource_id);
    }

    // 6. Complete main job record
    await db.database
      .from("jobs")
      .update({
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
      })
      .eq("id", payload.jobId);

    await tasks.trigger("send-webhook", {
      workspaceId: job.workspace_id,
      event: "job.completed",
      payload: {
        jobId: job.id,
        type: job.type,
        title: job.title,
        status: "completed",
        progress: 100,
        durationMs,
        resourceId: job.resource_id,
        resourceType: job.resource_type,
      },
    });

    metadata.set("stage", "completed");
    logger.info("Background job task completed successfully", { jobId: payload.jobId });
    return { success: true };
  },
});
