export const VOICE_CATEGORIES = [
  "AUDIOBOOK",
  "CONVERSATIONAL",
  "CUSTOMER_SERVICE",
  "GENERAL",
  "NARRATIVE",
  "CHARACTERS",
  "MEDITATION",
  "MOTIVATIONAL",
  "PODCAST",
  "ADVERTISING",
  "VOICEOVER",
  "CORPORATE",
] as const;

export type VoiceCategory = (typeof VOICE_CATEGORIES)[number];

export const VOICE_CATEGORY_LABELS: Record<VoiceCategory, string> = {
  AUDIOBOOK: "Audiobook",
  CONVERSATIONAL: "Conversational",
  CUSTOMER_SERVICE: "Customer Service",
  GENERAL: "General",
  NARRATIVE: "Narrative",
  CHARACTERS: "Characters",
  MEDITATION: "Meditation",
  MOTIVATIONAL: "Motivational",
  PODCAST: "Podcast",
  ADVERTISING: "Advertising",
  VOICEOVER: "Voiceover",
  CORPORATE: "Corporate",
};
