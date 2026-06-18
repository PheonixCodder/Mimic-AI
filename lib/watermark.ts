import { z } from "zod";

export const WATERMARK_POSITIONS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;

export const WATERMARK_TYPES = ["text", "logo"] as const;
export const WATERMARK_SIZES = ["small", "medium", "large"] as const;

export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];
export type WatermarkType = (typeof WATERMARK_TYPES)[number];
export type WatermarkSize = (typeof WATERMARK_SIZES)[number];

export const SYSTEM_WATERMARK_DEFAULTS = {
  watermarkEnabled: true,
  watermarkText: "mimic.ai",
  watermarkType: "text" as WatermarkType,
  watermarkPosition: "bottom-right" as WatermarkPosition,
  watermarkOpacity: 0.4,
  watermarkSize: "medium" as WatermarkSize,
};

export const watermarkFieldsSchema = z.object({
  watermarkEnabled: z.boolean().optional(),
  watermarkText: z.string().trim().min(1).max(120).optional(),
  watermarkType: z.enum(WATERMARK_TYPES).optional(),
  watermarkPosition: z.enum(WATERMARK_POSITIONS).optional(),
  watermarkOpacity: z.number().min(0.1).max(1).optional(),
  watermarkSize: z.enum(WATERMARK_SIZES).optional(),
});

export type WatermarkFieldsInput = z.infer<typeof watermarkFieldsSchema>;

export type ResolvedWatermark = {
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkType: WatermarkType;
  watermarkPosition: WatermarkPosition;
  watermarkOpacity: number;
  watermarkSize: WatermarkSize;
  watermarkLogoKey: string | null;
};

export type BrandKitWatermarkSource = {
  watermark_text?: string | null;
  watermark_type?: string | null;
  watermark_position?: string | null;
  watermark_opacity?: number | string | null;
  watermark_size?: string | null;
  logo_key?: string | null;
};

function parseWatermarkType(value: string | null | undefined): WatermarkType {
  return value === "logo" ? "logo" : "text";
}

function parseWatermarkPosition(value: string | null | undefined): WatermarkPosition {
  if (value && WATERMARK_POSITIONS.includes(value as WatermarkPosition)) {
    return value as WatermarkPosition;
  }
  return SYSTEM_WATERMARK_DEFAULTS.watermarkPosition;
}

function parseWatermarkSize(value: string | null | undefined): WatermarkSize {
  if (value && WATERMARK_SIZES.includes(value as WatermarkSize)) {
    return value as WatermarkSize;
  }
  return SYSTEM_WATERMARK_DEFAULTS.watermarkSize;
}

function parseOpacity(value: number | string | null | undefined): number {
  if (value == null) {
    return SYSTEM_WATERMARK_DEFAULTS.watermarkOpacity;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return SYSTEM_WATERMARK_DEFAULTS.watermarkOpacity;
  }
  return Math.min(1, Math.max(0.1, parsed));
}

function defaultsFromBrandKit(
  brandKit?: BrandKitWatermarkSource | null,
): Omit<ResolvedWatermark, "watermarkEnabled"> {
  const watermarkType = parseWatermarkType(brandKit?.watermark_type);
  return {
    watermarkText: brandKit?.watermark_text?.trim() || SYSTEM_WATERMARK_DEFAULTS.watermarkText,
    watermarkType,
    watermarkPosition: parseWatermarkPosition(brandKit?.watermark_position),
    watermarkOpacity: parseOpacity(brandKit?.watermark_opacity),
    watermarkSize: parseWatermarkSize(brandKit?.watermark_size),
    watermarkLogoKey:
      watermarkType === "logo" ? brandKit?.logo_key ?? null : null,
  };
}

export function resolveWatermarkSettings({
  isPremium,
  brandKit,
  userInput,
}: {
  isPremium: boolean;
  brandKit?: BrandKitWatermarkSource | null;
  userInput?: WatermarkFieldsInput | null;
}): ResolvedWatermark {
  if (!isPremium) {
    return {
      ...SYSTEM_WATERMARK_DEFAULTS,
      watermarkLogoKey: null,
    };
  }

  const brandDefaults = defaultsFromBrandKit(brandKit);
  const watermarkType = userInput?.watermarkType ?? brandDefaults.watermarkType;
  const watermarkEnabled =
    userInput?.watermarkEnabled ?? SYSTEM_WATERMARK_DEFAULTS.watermarkEnabled;

  if (!watermarkEnabled) {
    return {
      watermarkEnabled: false,
      watermarkText: brandDefaults.watermarkText,
      watermarkType,
      watermarkPosition: brandDefaults.watermarkPosition,
      watermarkOpacity: brandDefaults.watermarkOpacity,
      watermarkSize: brandDefaults.watermarkSize,
      watermarkLogoKey: null,
    };
  }

  return {
    watermarkEnabled: true,
    watermarkText:
      userInput?.watermarkText?.trim() || brandDefaults.watermarkText,
    watermarkType,
    watermarkPosition:
      userInput?.watermarkPosition ?? brandDefaults.watermarkPosition,
    watermarkOpacity:
      userInput?.watermarkOpacity ?? brandDefaults.watermarkOpacity,
    watermarkSize: userInput?.watermarkSize ?? brandDefaults.watermarkSize,
    watermarkLogoKey:
      watermarkType === "logo"
        ? brandKit?.logo_key ?? brandDefaults.watermarkLogoKey
        : null,
  };
}

export function watermarkToDbColumns(watermark: ResolvedWatermark) {
  return {
    watermark_enabled: watermark.watermarkEnabled,
    watermark_text: watermark.watermarkText,
    watermark_type: watermark.watermarkType,
    watermark_position: watermark.watermarkPosition,
    watermark_opacity: watermark.watermarkOpacity,
    watermark_size: watermark.watermarkSize,
  };
}

export function watermarkBrandKitToDb(input: {
  watermarkText?: string;
  watermarkType?: WatermarkType;
  watermarkPosition?: WatermarkPosition;
  watermarkOpacity?: number;
  watermarkSize?: WatermarkSize;
}) {
  return {
    watermark_text: input.watermarkText ?? SYSTEM_WATERMARK_DEFAULTS.watermarkText,
    watermark_type: input.watermarkType ?? SYSTEM_WATERMARK_DEFAULTS.watermarkType,
    watermark_position:
      input.watermarkPosition ?? SYSTEM_WATERMARK_DEFAULTS.watermarkPosition,
    watermark_opacity:
      input.watermarkOpacity ?? SYSTEM_WATERMARK_DEFAULTS.watermarkOpacity,
    watermark_size: input.watermarkSize ?? SYSTEM_WATERMARK_DEFAULTS.watermarkSize,
  };
}
