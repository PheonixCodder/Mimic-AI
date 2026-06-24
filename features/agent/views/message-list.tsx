import { useEffect, useRef, Suspense } from "react";
import { User, Bot, Loader2, AlertTriangle, Wifi, KeyRound, RefreshCcw } from "lucide-react";
import { VoiceCard } from "@/features/voices/components/voice-card";
import { AvatarCard } from "@/features/avatars/components/avatar-card";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
  TaskItemFile,
} from "@/components/ai-elements/task";
import type { ReactNode } from "react";

export interface AgentUIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string;
  toolCalls?: any[];
  toolResults?: Record<string, { name: string; result: any }>;
  interrupt?: {
    toolCall: any;
    sessionId: string;
  };
  isError?: boolean;
}

interface MessageListProps {
  messages: AgentUIMessage[];
  isLoadingMessages: boolean;
  isGenerating: boolean;
  renderInterrupt: (msg: AgentUIMessage) => ReactNode;
}

export function MessageList({
  messages,
  isLoadingMessages,
  isGenerating,
  renderInterrupt,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on messages update (Phase 4.4)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoadingMessages) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground text-xs font-outfit">
        <Loader2 className="size-5 animate-spin text-emerald-500" />
        <span>Retrieving message archive...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm font-outfit">
        Prompt the agent to begin orchestration.
      </div>
    );
  }

  return (
    <Conversation className="flex-1 p-6">
      <ConversationContent className="max-w-3xl mx-auto space-y-6">
        {messages.map((m) => (
          <Message key={m.id} from={m.role as "user" | "assistant"}>
            {/* Error card — replaces the full message bubble */}
            {m.isError ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 font-outfit">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {m.content.includes("Authentication") || m.content.includes("API key") ? (
                      <KeyRound className="size-4 text-red-500" />
                    ) : m.content.includes("Rate limit") || m.content.includes("rate-limited") ? (
                      <RefreshCcw className="size-4 text-amber-500" />
                    ) : m.content.includes("Database") || m.content.includes("connection") ? (
                      <Wifi className="size-4 text-red-500" />
                    ) : (
                      <AlertTriangle className="size-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1
                      text-red-500
                      [&:has(~_p:not([class*=amber]))]:text-red-500
                    ">
                      {m.content.includes("Authentication") || m.content.includes("API key") ? "API Key Error" :
                       m.content.includes("Rate limit") || m.content.includes("rate-limited") ? "Rate Limited — Retrying" :
                       m.content.includes("Database") || m.content.includes("connection") ? "Network Error" :
                       m.content.includes("recursion") ? "Execution Loop Detected" :
                       "Agent Error"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{m.content}</p>
                  </div>
                </div>
              </div>
            ) : (
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  m.role === "user"
                    ? "bg-secondary text-foreground"
                    : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10"
                }`}
              >
                {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>
              <div className="flex-1 min-w-0">
                {/* Real-time reasoning visualization */}
                {m.role === "assistant" && m.reasoning && (
                  <Reasoning
                    isStreaming={isGenerating && !m.content}
                    defaultOpen={true}
                  >
                    <ReasoningTrigger />
                    <ReasoningContent>{m.reasoning}</ReasoningContent>
                  </Reasoning>
                )}

                {m.content && (
                  <MessageContent className="text-sm leading-relaxed prose prose-emerald dark:prose-invert">
                    <MessageResponse>{m.content}</MessageResponse>
                  </MessageContent>
                )}

                {/* Real-time tasks progress checklist */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <Task className="mt-4 font-outfit border border-muted/50 rounded-lg p-3 bg-muted/5" defaultOpen={true}>
                    <TaskTrigger title="Agent Executions" />
                    <TaskContent>
                      {m.toolCalls.map((tc: any) => {
                        const res = m.toolResults?.[tc.id];
                        const isDone = !!res;
                        return (
                          <TaskItem key={tc.id} className="flex items-center gap-2 py-1">
                            {isDone ? (
                              <span className="text-[9px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                                Success
                              </span>
                            ) : (
                              <Loader2 className="size-3 animate-spin text-emerald-500 shrink-0" />
                            )}
                            <span className="flex-1 truncate text-xs text-muted-foreground">
                              Running <strong>{tc.name}</strong>
                            </span>
                            {tc.args && Object.keys(tc.args).length > 0 && (
                              <div className="flex gap-1 overflow-x-auto max-w-[200px] shrink-0">
                                {Object.entries(tc.args).map(([key, val]) => (
                                  <TaskItemFile key={key} className="whitespace-nowrap font-mono text-[9px] py-0 px-1">
                                    {key}: {String(val)}
                                  </TaskItemFile>
                                ))}
                              </div>
                            )}
                          </TaskItem>
                        );
                      })}
                    </TaskContent>
                  </Task>
                )}

                {/* Tool Calls Logs inside assistant messages */}
                {m.toolCalls &&
                  m.toolCalls.map((tc: any) => {
                    const res = m.toolResults?.[tc.id];
                    const state = res ? "output-available" : "input-available";
                    return (
                      <Tool key={tc.id} className="mt-4 font-outfit">
                        <ToolHeader
                          title={tc.name}
                          type="dynamic-tool"
                          toolName={tc.name}
                          state={state}
                        />
                        <ToolContent>
                          <ToolInput input={tc.args} />
                          {res && (() => {
                            const isString = typeof res.result === "string";
                            let parsed = null;
                            if (isString) {
                              try {
                                parsed = JSON.parse(res.result);
                              } catch (e) {}
                            } else if (res.result && (typeof res.result === "object" || Array.isArray(res.result))) {
                              parsed = res.result;
                            }

                            if (tc.name === "list_voices" && Array.isArray(parsed)) {
                              const voices = parsed.map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                variant: (item.variant === "custom" ? "custom" : "system") as "system" | "custom",
                                category: item.category || "male",
                                language: item.language || "en-US",
                                status: item.status || "active",
                                qualityScore: item.quality_score !== undefined ? item.quality_score : (item.qualityScore !== undefined ? item.qualityScore : 100),
                                description: item.description || "Synthesized voice model.",
                                workspaceId: item.workspace_id || item.workspaceId || null,
                                createdBy: item.created_by || item.createdBy || null,
                                validationResults: item.validation_results || item.validationResults || null,
                                autoValidatedAt: item.auto_validated_at || item.autoValidatedAt || null,
                                createdAt: item.created_at || item.createdAt || new Date().toISOString(),
                                updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
                              }));

                              return (
                                <div className="mt-2 space-y-2">
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    Retrieved Voices List
                                  </div>
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {voices.map((voice) => (
                                      <VoiceCard key={voice.id} voice={voice} canDelete={false} />
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            if (tc.name === "list_avatars" && Array.isArray(parsed)) {
                              const avatars = parsed.map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                variant: (item.variant === "custom" ? "custom" : "system") as "system" | "custom",
                                style: item.style || "photo",
                                status: item.status || "active",
                                readinessScore: item.readiness_score !== undefined ? item.readiness_score : (item.readinessScore !== undefined ? item.readinessScore : 100),
                                description: item.description || "Talking avatar model.",
                                workspaceId: item.workspace_id || item.workspaceId || null,
                                createdBy: item.created_by || item.createdBy || null,
                                validationResults: item.validation_results || item.validationResults || null,
                                autoValidatedAt: item.auto_validated_at || item.autoValidatedAt || null,
                                modelVariantId: item.model_variant_id || item.modelVariantId || null,
                                createdAt: item.created_at || item.createdAt || new Date().toISOString(),
                                updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
                              }));

                              return (
                                <div className="mt-2 space-y-2">
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    Retrieved Avatars List
                                  </div>
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {avatars.map((avatar) => (
                                      <Suspense
                                        key={avatar.id}
                                        fallback={<div className="h-24 rounded-xl border animate-pulse bg-muted" />}
                                      >
                                        <AvatarCard avatar={avatar} canDelete={false} />
                                      </Suspense>
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <ToolOutput
                                output={res.result}
                                errorText={res.result?.error || null}
                              />
                            );
                          })()}
                        </ToolContent>
                      </Tool>
                    );
                  })}

                {/* Tool Approval Interruption Panel / Wizard */}
                {m.interrupt && renderInterrupt(m)}
              </div>
            </div>
            )}
          </Message>
        ))}
        {/* Dummy div to scroll to */}
        <div ref={bottomRef} />
      </ConversationContent>
    </Conversation>
  );
}
