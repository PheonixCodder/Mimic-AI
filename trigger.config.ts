import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { defineConfig } from "@trigger.dev/sdk";
import { syncEnvVars } from "@trigger.dev/build/extensions/core";

config({ path: ".env.local" });

const TASK_ENV_VARS = [
  "TRIGGER_PROJECT_REF",
  "APP_URL",
  "INSFORGE_API_KEY",
  "NEXT_PUBLIC_INSFORGE_URL",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "POLAR_ACCESS_TOKEN",
  "POLAR_SERVER",
  "POLAR_PRODUCT_ID",
  "POLAR_METER_VOICE_CLONE",
  "POLAR_METER_AVATAR",
  "POLAR_METER_SCRIPT",
  "POLAR_METER_SCRIPT_PROPERTY",
  "POLAR_METER_VIDEO",
  "POLAR_METER_VIDEO_PROPERTY",
  "CHATTERBOX_API_URL",
  "CHATTERBOX_API_KEY",
  "TALKING_AVATAR_API_URL",
  "TALKING_AVATAR_API_KEY",
  "VIDEO_GENERATION_API_URL",
  "VIDEO_GENERATION_API_KEY",
  "CAPTION_GENERATION_API_URL",
  "CAPTION_GENERATION_API_KEY",
  "VIDEO_COMPOSITION_API_URL",
  "VIDEO_COMPOSITION_API_KEY", 
  "NEXT_PUBLIC_APP_URL", 
  "VOICE_VALIDATION_API_URL",
  "VOICE_VALIDATION_API_KEY",
  "AVATAR_VALIDATION_API_URL",
  "AVATAR_VALIDATION_API_KEY",
  "FLUX_LORA_TRAINER_API_URL",
  "NEXT_PUBLIC_INSFORGE_ANON_KEY",
  "FLUX_LORA_TRAINER_API_KEY",
  "FLUX_INFERENCE_API_URL", 
  "FLUX_INFERENCE_API_KEY",
  "REPLICATE_API_TOKEN",
] as const;

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF!,
  dirs: ["./trigger"],
  maxDuration: 900,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      factor: 1.8,
    },
  },
  build: {
    extensions: [
      syncEnvVars(async () => {
        const envContent = readFileSync(".env.local", "utf-8");
        return Object.fromEntries(
          envContent
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith("#"))
            .map((line) => {
              const index = line.indexOf("=");
              return [line.slice(0, index), line.slice(index + 1)] as const;
            })
            .filter(([key]) =>
              TASK_ENV_VARS.includes(key as (typeof TASK_ENV_VARS)[number]),
            ),
        );
      }),
    ],
  },
});
