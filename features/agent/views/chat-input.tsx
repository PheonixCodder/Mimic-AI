import { useState, type FormEvent } from "react";
import { Key, Paperclip, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVIDERS, MODELS, type ProviderId } from "../config/models";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputButton,
  usePromptInputAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
} from "@/components/ai-elements/prompt-input";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
} from "@/components/ai-elements/attachments";

interface ChatInputProps {
  onSubmit: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => Promise<void>;
  isGenerating: boolean;
  hasApiKey: boolean;
  onShowSettings: () => void;
  activeInterrupt: boolean;
  selectedProvider: string;
  selectedModel: string;
  apiKey: string;
  temperature: number;
  updateSettings: (updates: {
    provider?: string;
    model?: string;
    apiKey?: string;
    temperature?: number;
  }) => void;
}

export function ChatInput({
  onSubmit,
  isGenerating,
  hasApiKey,
  onShowSettings,
  activeInterrupt,
  selectedProvider,
  selectedModel,
  apiKey,
  temperature,
  updateSettings,
}: ChatInputProps) {
  const isChatDisabled = isGenerating || activeInterrupt || !hasApiKey;
  const chatStatus = isGenerating ? "streaming" : "ready";

  return (
    <div className="border-t p-4 bg-muted/10 font-outfit">
      <div className="max-w-3xl mx-auto space-y-3">
        {!hasApiKey && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Key className="size-3.5 text-amber-600 shrink-0" />
              <span>
                API Key is required to chat. Enter your API key below or configure it in the selectors.
              </span>
            </span>
          </div>
        )}
        <PromptInput onSubmit={onSubmit}>
          <PromptInputInner
            isGenerating={isGenerating}
            activeInterrupt={activeInterrupt}
            hasApiKey={hasApiKey}
            isChatDisabled={isChatDisabled}
            chatStatus={chatStatus}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            apiKey={apiKey}
            temperature={temperature}
            updateSettings={updateSettings}
          />
        </PromptInput>
      </div>
    </div>
  );
}

// Inner component to access PromptInput attachment context safely
function PromptInputInner({
  isGenerating,
  activeInterrupt,
  hasApiKey,
  isChatDisabled,
  chatStatus,
  selectedProvider,
  selectedModel,
  apiKey,
  temperature,
  updateSettings,
}: any) {
  const attachments = usePromptInputAttachments();
  const [showKeyField, setShowKeyField] = useState(false);
  const [tempPopoverOpen, setTempPopoverOpen] = useState(false);

  const modelsForProvider = MODELS[selectedProvider as ProviderId] || [];

  const handleProviderChange = (val: string) => {
    const v = val as ProviderId;
    let defaultModel = "meta-llama/llama-3.3-70b-instruct:free";
    if (v === "google-genai") defaultModel = "gemini-2.5-flash";
    else if (v === "openai") defaultModel = "gpt-4o-mini";
    else if (v === "anthropic") defaultModel = "claude-3-5-sonnet-latest";

    updateSettings({
      provider: v,
      model: defaultModel,
    });
  };

  return (
    <PromptInputBody className="border rounded-xl bg-background shadow-sm flex flex-col p-2 min-h-[140px] focus-within:ring-1 focus-within:ring-emerald-500/30 border-muted">
      {/* 1. Header Row: Selectors (Provider, Model, Key, Temp) */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-b border-muted/50 text-xs">
        {/* Provider Select */}
        <Select value={selectedProvider} onValueChange={handleProviderChange}>
          <SelectTrigger className="h-7 text-[11px] px-2 py-0 border-none bg-secondary/50 hover:bg-secondary text-muted-foreground shadow-none font-outfit font-medium rounded-md w-auto gap-1">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent className="font-outfit text-xs">
            {PROVIDERS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Model Select */}
        <Select value={selectedModel} onValueChange={(model) => updateSettings({ model })}>
          <SelectTrigger className="h-7 text-[11px] px-2 py-0 border-none bg-secondary/50 hover:bg-secondary text-muted-foreground shadow-none font-mono rounded-md max-w-[200px] truncate gap-1">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent className="font-mono text-xs max-h-[300px]">
            {modelsForProvider.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Temperature Quick Trigger */}
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTempPopoverOpen(!tempPopoverOpen)}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground font-outfit"
          >
            Temp: {temperature}
          </Button>
          {tempPopoverOpen && (
            <div className="absolute z-50 mt-1 p-3 bg-popover border rounded-lg shadow-md w-40 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                <span>Temp</span>
                <span>{temperature}</span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={[temperature]}
                onValueChange={([val]) => updateSettings({ temperature: val })}
                className="py-1"
              />
              <Button
                type="button"
                size="sm"
                className="w-full h-6 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                onClick={() => setTempPopoverOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </div>

        {/* API Key Toggle/Field */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowKeyField(!showKeyField)}
            className={`h-7 px-2 text-[11px] font-outfit flex items-center gap-1 ${
              apiKey ? "text-emerald-500" : "text-amber-500 hover:text-amber-600"
            }`}
          >
            <Key className="size-3" />
            <span>{apiKey ? "Key Set" : "Enter Key"}</span>
          </Button>

          {showKeyField && (
            <input
              type="password"
              placeholder="API Key"
              value={apiKey}
              onChange={(e) => updateSettings({ apiKey: e.target.value })}
              className="h-7 px-2 text-xs border rounded bg-background font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50 w-28"
            />
          )}
        </div>
      </div>

      {/* 2. Textarea */}
      <PromptInputTextarea
        placeholder={
          isGenerating
            ? "Generating response..."
            : activeInterrupt
            ? "Awaiting tool approval. Respond above."
            : !hasApiKey
            ? "Please enter your API key to start chatting."
            : "Command the Co-Producer (e.g. 'Create a project named tutorial and draft a productivity script')"
        }
        disabled={isChatDisabled}
        className="
          min-h-[80px]!
          max-h-[200px]
          w-full
          resize-none
          bg-transparent
          py-2
          px-3
          text-sm
          focus:outline-none
          focus:ring-0
          border-none
        "
      />

      {/* 3. Attachments Display */}
      {attachments.files.length > 0 && (
        <div className="px-3 pb-2">
          <Attachments variant="inline">
            {attachments.files.map((file) => (
              <Attachment
                key={file.id}
                data={file}
                onRemove={() => attachments.remove(file.id)}
              >
                <AttachmentPreview />
                <AttachmentInfo />
                <AttachmentRemove />
              </Attachment>
            ))}
          </Attachments>
        </div>
      )}

      {/* 4. Footer Row: Attachment menu + Submit */}
      <div className="flex items-center justify-between border-t border-muted/50 pt-2 px-2 mt-auto">
        <div className="flex items-center gap-1">
          {/* File Upload Trigger using the PromptInputActionMenu */}
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger className="text-muted-foreground hover:text-foreground">
              <Paperclip className="size-4" />
            </PromptInputActionMenuTrigger>
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
              <PromptInputActionAddScreenshot />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </div>

        {/* Submit Button */}
        <PromptInputSubmit
          status={chatStatus}
          disabled={isChatDisabled}
          className="h-8 w-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shrink-0 disabled:opacity-50"
        />
      </div>
    </PromptInputBody>
  );
}
