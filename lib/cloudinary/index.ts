import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";

const isConfigured = !!(
  env.CLOUDINARY_CLOUD_NAME &&
  env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function isCloudinaryConfigured(): boolean {
  return isConfigured;
}

type SignedUrlOptions = {
  resourceType?: "image" | "video";
  width?: number;
  height?: number;
  format?: string;
  crop?: string;
  gravity?: string;
};

/**
 * Generates an HMAC-signed Cloudinary Fetch URL for a remote asset.
 * By using signed fetch URLs, we prevent abuse of our Cloudinary account.
 */
export function getSignedFetchUrl(
  remoteUrl: string,
  options: SignedUrlOptions = {}
): string {
  if (!isConfigured) {
    throw new Error("Cloudinary is not configured. Check environment variables.");
  }

  const {
    resourceType = "image",
    width,
    height,
    format,
    crop = "fill",
    gravity,
  } = options;

  // Build the transformation parameters
  const transformOptions: Record<string, any> = {
    type: "fetch",
    sign_url: true,
    secure: true,
  };

  if (resourceType) {
    transformOptions.resource_type = resourceType;
  }

  if (width) transformOptions.width = width;
  if (height) transformOptions.height = height;

  if (width || height) {
    transformOptions.crop = crop;
    // For portraits/avatars default to face gravity, for others default to auto
    transformOptions.gravity = gravity || (resourceType === "image" ? "face" : "auto");
  }

  // format and quality optimization
  if (format) {
    transformOptions.format = format;
  } else {
    // If not specific format, use auto format and auto quality
    transformOptions.fetch_format = "auto";
    transformOptions.quality = "auto";
  }

  return cloudinary.url(remoteUrl, transformOptions);
}

/**
 * Uploads an image buffer to Cloudinary, requests AI background removal,
 * downloads the resulting transparent PNG, and deletes the temporary asset from Cloudinary.
 */
export async function removeBackground(
  buffer: Buffer,
  contentType: string
): Promise<Buffer> {
  if (!isConfigured) {
    throw new Error("Cloudinary is not configured. Background removal is unavailable.");
  }

  const base64Data = `data:${contentType};base64,${buffer.toString("base64")}`;

  // Upload to Cloudinary with AI background removal requested
  const uploadResult = await cloudinary.uploader.upload(base64Data, {
    background_removal: "cloudinary_ai",
  });

  // Verify we received a valid URL
  const processedUrl = uploadResult.secure_url;
  if (!processedUrl) {
    throw new Error("Cloudinary upload failed to return a secure URL.");
  }

  // Fetch the transparent PNG file from the secure URL
  const response = await fetch(processedUrl);
  if (!response.ok) {
    // Attempt cleanup before throwing
    try {
      await cloudinary.uploader.destroy(uploadResult.public_id);
    } catch {}
    throw new Error(`Failed to download processed image from Cloudinary: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const processedBuffer = Buffer.from(arrayBuffer);

  // Clean up the temporary asset in Cloudinary
  try {
    await cloudinary.uploader.destroy(uploadResult.public_id);
  } catch (err) {
    console.error("Failed to delete temporary Cloudinary asset:", err);
  }

  return processedBuffer;
}
