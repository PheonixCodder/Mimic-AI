export const AVATAR_STYLES = [
  "PROFESSIONAL",
  "PORTRAIT",
  "CASUAL",
  "PRESENTER",
  "STUDIO",
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];

export const AVATAR_STYLE_LABELS: Record<AvatarStyle, string> = {
  PROFESSIONAL: "Professional",
  PORTRAIT: "Portrait",
  CASUAL: "Casual",
  PRESENTER: "Presenter",
  STUDIO: "Studio",
};
