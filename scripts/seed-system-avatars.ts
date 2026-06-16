import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createAdminClient } from "@insforge/sdk";
import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";

import {
  CANONICAL_SYSTEM_AVATAR_NAMES,
  type SystemAvatarName,
} from "../features/avatars/data/avatar-scoping";
import type { AvatarStyle } from "../features/avatars/data/avatar-styles";

dotenv.config({ path: ".env.local" });

const SYSTEM_AVATARS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "avatars",
);

const envSchema = z.object({
  NEXT_PUBLIC_INSFORGE_URL: z.string().url(),
  INSFORGE_API_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
});

const env = envSchema.parse(process.env);

const insforge = createAdminClient({
  baseUrl: env.NEXT_PUBLIC_INSFORGE_URL,
  apiKey: env.INSFORGE_API_KEY,
});

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

interface AvatarMetadata {
  description: string;
  style: AvatarStyle;
}

const systemAvatarMetadata: Record<SystemAvatarName, AvatarMetadata> = {
  Alex: {
    description: "Friendly professional with a clean studio portrait look",
    style: "PROFESSIONAL",
  },
  Harvey: {
    description: "Warm and approachable with a confident smile",
    style: "CASUAL",
  },
  Lara: {
    description: "Soft natural portrait with even lighting",
    style: "PORTRAIT",
  },
  Louis: {
    description: "Polished presenter style with glasses",
    style: "PRESENTER",
  },
  Lucy: {
    description: "Calm studio headshot with a gentle expression",
    style: "STUDIO",
  },
  Mark: {
    description: "Relaxed professional in a neutral setting",
    style: "PROFESSIONAL",
  },
  Mike: {
    description: "Clear front-facing portrait suited for explainers",
    style: "PRESENTER",
  },
  Sara: {
    description: "Warm and trustworthy business portrait",
    style: "PROFESSIONAL",
  },
  Simon: {
    description: "Neutral studio portrait with a professional tone",
    style: "STUDIO",
  },
  Tracy: {
    description: "Bright and engaging portrait for marketing content",
    style: "CASUAL",
  },
};

async function readSystemAvatarImage(name: string) {
  const filePath = path.join(SYSTEM_AVATARS_DIR, `${name}.png`);
  const buffer = Buffer.from(await fs.readFile(filePath));
  return { buffer, contentType: "image/png" };
}

async function uploadSystemAvatarImage({
  key,
  buffer,
  contentType,
}: {
  key: string;
  buffer: Buffer;
  contentType: string;
}) {
  const commandInput: PutObjectCommandInput = {
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };

  await r2.send(new PutObjectCommand(commandInput));
}

async function seedSystemAvatar(name: SystemAvatarName) {
  const { buffer, contentType } = await readSystemAvatarImage(name);
  const meta = systemAvatarMetadata[name];

  const { data: existingRows, error: existingError } = await insforge.database
    .from("avatars")
    .select("id")
    .eq("variant", "system")
    .eq("name", name)
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existing = existingRows?.[0] as { id: string } | undefined;

  if (existing) {
    const r2ObjectKey = `avatars/system/${existing.id}`;

    await uploadSystemAvatarImage({
      key: r2ObjectKey,
      buffer,
      contentType,
    });

    const { error } = await insforge.database
      .from("avatars")
      .update({
        r2_object_key: r2ObjectKey,
        description: meta.description,
        style: meta.style,
        status: "ready",
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { data: createdRows, error: createError } = await insforge.database
    .from("avatars")
    .insert({
      variant: "system",
      workspace_id: null,
      created_by: null,
      name,
      description: meta.description,
      style: meta.style,
      status: "ready",
    })
    .select("id");

  if (createError) {
    throw new Error(createError.message);
  }

  const avatar = createdRows?.[0] as { id: string } | undefined;

  if (!avatar) {
    throw new Error(`Failed to create system avatar row for ${name}`);
  }

  const r2ObjectKey = `avatars/system/${avatar.id}`;

  try {
    await uploadSystemAvatarImage({
      key: r2ObjectKey,
      buffer,
      contentType,
    });

    const { error: updateError } = await insforge.database
      .from("avatars")
      .update({ r2_object_key: r2ObjectKey })
      .eq("id", avatar.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } catch (error) {
    await insforge.database.from("avatars").delete().eq("id", avatar.id);
    throw error;
  }
}

async function main() {
  console.log(
    `Seeding ${CANONICAL_SYSTEM_AVATAR_NAMES.length} system avatars...`,
  );

  for (const name of CANONICAL_SYSTEM_AVATAR_NAMES) {
    console.log(`- ${name}`);
    await seedSystemAvatar(name);
  }

  console.log("System avatar seed completed.");
}

main()
  .catch((error) => {
    console.error("Failed to seed system avatars:", error);
    process.exitCode = 1;
  });
