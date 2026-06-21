import "server-only";

/**
 * Mimic AI pricing configuration (USD).
 *
 * These are placeholder rates that can be adjusted from the Polar dashboard
 * or environment variables later. The structure is intentionally simple so
 * the estimate engine can be updated without touching UI code.
 */
export const PRICING = {
  /** Cost per voice clone / custom voice used in a generation. */
  voiceClone: 0.3,

  /** Cost per avatar generation / custom avatar used in a generation. */
  avatarGeneration: 0.5,

  /** Cost per script character. */
  scriptPerCharacter: 0.003,

  /** Fixed cost per caption generation job. */
  captionGeneration: 0.05,

  /** Cost per compute unit for rendering/export. */
  computeUnitRates: {
    "720p": 0.05,
    "1080p": 0.1,
    "4k": 0.25,
  } as const,

  /** Resolution multiplier applied to compute units for video generation. */
  resolutionMultiplier: {
    "720p": 1,
    "1080p": 1.5,
    "4k": 2.5,
  } as const,
} as const;

export type Resolution = keyof typeof PRICING.computeUnitRates;

export interface EstimateLineItem {
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
}

export interface CostEstimate {
  lineItems: EstimateLineItem[];
  total: number;
  currency: "USD";
}

export interface EstimateInput {
  /** Length of the script in characters. */
  scriptCharacterCount: number;
  /** Target export resolution. */
  resolution: Resolution;
  /** Whether captions are enabled. */
  includeCaptions?: boolean;
  /** Whether a custom voice is used. System voices are free. */
  isCustomVoice?: boolean;
  /** Whether a custom avatar is used. System avatars are free. */
  isCustomAvatar?: boolean;
  /** Estimated video duration in seconds. If omitted, inferred from script. */
  estimatedDurationSeconds?: number;
}

/**
 * Estimate the cost of a single video generation.
 *
 * The estimate is deterministic and does not perform any external API calls,
 * so it can be run safely in tRPC procedures and the UI.
 */
export function estimateVideoCost(input: EstimateInput): CostEstimate {
  const {
    scriptCharacterCount,
    resolution,
    includeCaptions = false,
    isCustomVoice = false,
    isCustomAvatar = false,
    estimatedDurationSeconds,
  } = input;

  const lineItems: EstimateLineItem[] = [];

  // Script cost
  const scriptCost = scriptCharacterCount * PRICING.scriptPerCharacter;
  lineItems.push({
    name: "Script",
    quantity: scriptCharacterCount,
    unit: "character",
    unitCost: PRICING.scriptPerCharacter,
    total: scriptCost,
  });

  // Voice cost (only charged for custom clones)
  if (isCustomVoice) {
    lineItems.push({
      name: "Custom voice",
      quantity: 1,
      unit: "clone use",
      unitCost: PRICING.voiceClone,
      total: PRICING.voiceClone,
    });
  }

  // Avatar cost (only charged for custom avatars)
  if (isCustomAvatar) {
    lineItems.push({
      name: "Custom avatar",
      quantity: 1,
      unit: "avatar use",
      unitCost: PRICING.avatarGeneration,
      total: PRICING.avatarGeneration,
    });
  }

  // Video generation / rendering compute cost
  const duration =
    estimatedDurationSeconds ?? estimateDurationFromScript(scriptCharacterCount);
  const computeUnits =
    duration * PRICING.resolutionMultiplier[resolution];
  const computeUnitRate = PRICING.computeUnitRates[resolution];
  const renderCost = computeUnits * computeUnitRate;

  lineItems.push({
    name: "Video generation",
    quantity: Number(computeUnits.toFixed(2)),
    unit: "compute unit",
    unitCost: computeUnitRate,
    total: renderCost,
  });

  // Caption generation
  if (includeCaptions) {
    lineItems.push({
      name: "Captions",
      quantity: 1,
      unit: "job",
      unitCost: PRICING.captionGeneration,
      total: PRICING.captionGeneration,
    });
  }

  const total = lineItems.reduce((sum, item) => sum + item.total, 0);

  return {
    lineItems,
    total: Number(total.toFixed(4)),
    currency: "USD",
  };
}

/**
 * Roughly estimate speech duration from character count.
 *
 * Assumes ~5 characters per word and ~0.35 seconds per word (the same rate
 * used by the simulated caption generator).
 */
export function estimateDurationFromScript(characterCount: number): number {
  const words = Math.max(1, characterCount / 5);
  return words * 0.35;
}

/**
 * Format a cost estimate as a human-readable string.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}
