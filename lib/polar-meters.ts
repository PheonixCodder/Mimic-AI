import "server-only";

import { env } from "@/lib/env";

/** Polar meter slugs and Sum metadata keys — used when ingesting usage events. */
export function getPolarMeterConfig() {
  return {
    voiceClone: env.POLAR_METER_VOICE_CLONE,
    avatar: env.POLAR_METER_AVATAR,
    script: env.POLAR_METER_SCRIPT,
    scriptProperty: env.POLAR_METER_SCRIPT_PROPERTY,
    video: env.POLAR_METER_VIDEO,
    videoProperty: env.POLAR_METER_VIDEO_PROPERTY,
  } as const;
}
