export const CANONICAL_SYSTEM_AVATAR_NAMES = [
  "Alex",
  "Harvey",
  "Lara",
  "Louis",
  "Lucy",
  "Mark",
  "Mike",
  "Sara",
  "Simon",
  "Tracy",
] as const;

export type SystemAvatarName = (typeof CANONICAL_SYSTEM_AVATAR_NAMES)[number];
