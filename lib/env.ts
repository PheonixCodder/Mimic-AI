import { config } from "dotenv";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

config({ path: ".env.local" });

export const env = createEnv({
  server: {
    INSFORGE_API_KEY: z.string().min(1),
    APP_URL: z.string().url(),
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),
    POLAR_ACCESS_TOKEN: z.string().min(1),
    POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),
    POLAR_PRODUCT_ID: z.string().min(1),
    POLAR_METER_VOICE_CLONE: z.string().min(1),
    POLAR_METER_AVATAR: z.string().min(1),
    POLAR_METER_SCRIPT: z.string().min(1),
    POLAR_METER_SCRIPT_PROPERTY: z.string().min(1),
    POLAR_METER_VIDEO: z.string().min(1),
    POLAR_METER_VIDEO_PROPERTY: z.string().min(1),
    TRIGGER_SECRET_KEY: z.string().min(1),
    TRIGGER_PROJECT_REF: z.string().min(1),
    RESEND_API_KEY: z.string().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_INSFORGE_URL: z.string().url(),
    NEXT_PUBLIC_INSFORGE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_INSFORGE_URL: process.env.NEXT_PUBLIC_INSFORGE_URL,
    NEXT_PUBLIC_INSFORGE_ANON_KEY: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
