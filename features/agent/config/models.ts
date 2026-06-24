export const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter (Recommended)", keyPlaceholder: "sk-or-..." },
  { id: "google-genai", label: "Google Gemini", keyPlaceholder: "AIza..." },
  { id: "openai", label: "OpenAI", keyPlaceholder: "sk-..." },
  { id: "anthropic", label: "Anthropic", keyPlaceholder: "sk-ant-..." },
] as const;

export type ProviderId = typeof PROVIDERS[number]["id"];

export interface ModelOption {
  id: string;
  label: string;
  free?: boolean;
}

export const MODELS: Record<ProviderId, ModelOption[]> = {
  openrouter: [
    { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Meta: Llama 3.3 70B Instruct (free)", free: true },
    { id: "meta-llama/llama-3.2-3b-instruct:free", label: "Meta: Llama 3.2 3B Instruct (free)", free: true },
    { id: "google/gemma-4-31b-it:free", label: "Google: Gemma 4 31B (free)", free: true },
    { id: "google/gemma-4-26b-a4b-it:free", label: "Google: Gemma 4 26B A4B (free)", free: true },
    { id: "google/lyria-3-pro-preview", label: "Google: Lyria 3 Pro Preview (free)", free: true },
    { id: "google/lyria-3-clip-preview", label: "Google: Lyria 3 Clip Preview (free)", free: true },
    { id: "openai/gpt-oss-120b:free", label: "OpenAI: gpt-oss-120b (free)", free: true },
    { id: "openai/gpt-oss-20b:free", label: "OpenAI: gpt-oss-20b (free)", free: true },
    { id: "cohere/north-mini-code:free", label: "Cohere: North Mini Code (free)", free: true },
    { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Nous: Hermes 3 405B Instruct (free)", free: true },
    { id: "qwen/qwen3-coder:free", label: "Qwen: Qwen3 Coder 480B A35B (free)", free: true },
    { id: "qwen/qwen3-next-80b-a3b-instruct:free", label: "Qwen: Qwen3 Next 80B A3B Instruct (free)", free: true },
    { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", label: "Venice: Uncensored (free)", free: true },
    { id: "openrouter/owl-alpha", label: "Owl Alpha (free)", free: true },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "NVIDIA: Nemotron 3 Super (free)", free: true },
    { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "NVIDIA: Nemotron 3 Ultra (free)", free: true },
    { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", label: "NVIDIA: Nemotron 3 Nano Omni (free)", free: true },
    { id: "nvidia/nemotron-3-nano-30b-a3b:free", label: "NVIDIA: Nemotron 3 Nano 30B A3B (free)", free: true },
    { id: "nvidia/nemotron-nano-12b-v2-vl:free", label: "NVIDIA: Nemotron Nano 12B 2 VL (free)", free: true },
    { id: "nvidia/nemotron-nano-9b-v2:free", label: "NVIDIA: Nemotron Nano 9B V2 (free)", free: true },
    { id: "nvidia/nemotron-3.5-content-safety:free", label: "NVIDIA: Nemotron 3.5 Content Safety (free)", free: true },
    { id: "poolside/laguna-xs.2:free", label: "Poolside: Laguna XS.2 (free)", free: true },
    { id: "poolside/laguna-m.1:free", label: "Poolside: Laguna M.1 (free)", free: true },
    { id: "liquid/lfm-2.5-1.2b-thinking:free", label: "LiquidAI: LFM2.5-1.2B-Thinking (free)", free: true },
    { id: "liquid/lfm-2.5-1.2b-instruct:free", label: "LiquidAI: LFM2.5-1.2B-Instruct (free)", free: true },
    { id: "google/gemini-2.5-flash", label: "google/gemini-2.5-flash" },
    { id: "google/gemini-2.5-pro", label: "google/gemini-2.5-pro" },
    { id: "anthropic/claude-3.5-sonnet", label: "anthropic/claude-3.5-sonnet" },
    { id: "openai/gpt-4o-mini", label: "openai/gpt-4o-mini" },
    { id: "openai/gpt-4o", label: "openai/gpt-4o" },
  ],
  "google-genai": [
    { id: "gemini-2.5-flash-lite", label: "gemini-2.5-flash-lite" },
    { id: "gemini-2.5-flash", label: "gemini-2.5-flash" },
    { id: "gemini-1.5-pro", label: "gemini-1.5-pro" },
  ],
  openai: [
    { id: "gpt-4o-mini", label: "gpt-4o-mini" },
    { id: "gpt-4o", label: "gpt-4o" },
  ],
  anthropic: [
    { id: "claude-3-5-sonnet-latest", label: "claude-3-5-sonnet" },
    { id: "claude-3-5-haiku-latest", label: "claude-3-5-haiku" },
  ],
};
