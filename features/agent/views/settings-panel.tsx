import { useState } from "react";
import { Sliders, Eye, EyeOff, Key, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import { PROVIDERS, MODELS, type ProviderId } from "../config/models";

interface SettingsPanelProps {
  activeSessionId: string | null;
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function SettingsPanel({
  activeSessionId,
  selectedProvider,
  setSelectedProvider,
  selectedModel,
  setSelectedModel,
  apiKey,
  setApiKey,
  temperature,
  setTemperature,
  onSave,
  isSaving,
}: SettingsPanelProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  const provider = PROVIDERS.find((p) => p.id === selectedProvider);
  const modelsForProvider = MODELS[selectedProvider as ProviderId] || [];

  const handleProviderChange = (val: string | null) => {
    if (!val) return;
    const v = val as ProviderId;
    setSelectedProvider(v);
    if (v === "openrouter") setSelectedModel("meta-llama/llama-3.3-70b-instruct:free");
    else if (v === "google-genai") setSelectedModel("gemini-2.5-flash");
    else if (v === "openai") setSelectedModel("gpt-4o-mini");
    else if (v === "anthropic") setSelectedModel("claude-3-5-sonnet-latest");
  };

  const isSmallModel =
    selectedProvider === "openrouter" &&
    (selectedModel.includes("1.2b") ||
      selectedModel.includes("3b") ||
      selectedModel.includes("nano") ||
      selectedModel.includes("north-mini"));

  return (
    <div className="mt-3 p-3 rounded-lg border bg-background space-y-4 text-xs font-outfit">
      {/* Provider Selector */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
          AI Provider
        </label>
        <Select value={selectedProvider} onValueChange={handleProviderChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select Provider" />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Model Selector */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
          Model
        </label>
        <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v ?? "")}>
          <SelectTrigger className="h-8 text-xs font-mono">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent className="font-mono text-xs">
            {selectedProvider === "openrouter" ? (
              <>
                <SelectGroup>
                  <SelectLabel className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase bg-muted/10 font-outfit">
                    Free Models
                  </SelectLabel>
                  {modelsForProvider
                    .filter((m) => m.free && !m.id.startsWith("nvidia/"))
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                </SelectGroup>
                <SelectSeparator className="my-1" />
                <SelectGroup>
                  <SelectLabel className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase bg-muted/10 font-outfit">
                    NVIDIA Free Models
                  </SelectLabel>
                  {modelsForProvider
                    .filter((m) => m.free && m.id.startsWith("nvidia/"))
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                </SelectGroup>
                <SelectSeparator className="my-1" />
                <SelectGroup>
                  <SelectLabel className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase bg-muted/10 font-outfit">
                    Paid Models (OpenRouter)
                  </SelectLabel>
                  {modelsForProvider
                    .filter((m) => !m.free)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </>
            ) : (
              modelsForProvider.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {isSmallModel && (
          <p className="text-[10px] text-amber-500 mt-1 leading-normal font-outfit">
            ⚠️ Small models (like 1.2B/3B/Nano) are prone to loops or reasoning errors with structured tools. Llama 3.3 70B (free) is recommended.
          </p>
        )}
      </div>

      {/* Custom API Key Input */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide flex items-center gap-1">
          <Key className="size-3 text-amber-500" />
          <span>Bring Your Own Key (BYOK)</span>
        </label>
        <div className="relative">
          <Input
            type={showApiKey ? "text" : "password"}
            placeholder={provider ? `${provider.keyPlaceholder} (Leave empty to use global)` : "Enter API key"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="h-8 pr-8 text-xs font-mono"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Temperature Control */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
            Temperature
          </label>
          <span className="text-[10px] font-mono text-muted-foreground">{temperature}</span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.1}
          value={[temperature]}
          onValueChange={([val]) => setTemperature(val)}
          className="py-2"
        />
      </div>

      {/* Save Settings Button */}
      <Button
        onClick={onSave}
        disabled={isSaving || !activeSessionId}
        size="sm"
        className="w-full text-xs h-8 bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
      >
        {isSaving ? (
          <Loader2 className="size-3.5 animate-spin mr-1" />
        ) : (
          <Check className="size-3.5 mr-1" />
        )}
        Save Session Settings
      </Button>
    </div>
  );
}
