"use client";

import { useEffect, useState, useRef, type FormEvent } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Cpu, Loader2 } from "lucide-react";
import {
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

// Decomposed imports
import { ThreadSidebar } from "./thread-sidebar";
import { SettingsPanel } from "./settings-panel";
import { MessageList, type AgentUIMessage } from "./message-list";
import { InterruptWizard } from "./interrupt-wizard";
import { ChatInput } from "./chat-input";
import { AgentErrorBoundary } from "./agent-error-boundary";

export function AgentView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Sessions CRUD queries/mutations
  const { data: sessions, isLoading: isLoadingSessions } = useQuery(
    trpc.agent.listSessions.queryOptions()
  );
  
  const createSessionMutation = useMutation(
    trpc.agent.createSession.mutationOptions({
      onSuccess: (newSession: { id: string }) => {
        queryClient.invalidateQueries({
          queryKey: trpc.agent.listSessions.queryKey(),
        });
        setActiveSessionId(newSession.id);
        toast.success("New thread created");
      },
      onError: (err) => toast.error(`Failed to create thread: ${err.message}`),
    })
  );

  const deleteSessionMutation = useMutation(
    trpc.agent.deleteSession.mutationOptions({
      onSuccess: (_: unknown, variables: { id: string }) => {
        queryClient.invalidateQueries({
          queryKey: trpc.agent.listSessions.queryKey(),
        });
        if (activeSessionId === variables.id) {
          setActiveSessionId(null);
          setMessages([]);
        }
        toast.success("Thread deleted");
      },
      onError: (err) => toast.error(`Failed to delete thread: ${err.message}`),
    })
  );

  const saveSettingsMutation = useMutation(
    trpc.agent.saveSettings.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.agent.listSessions.queryKey(),
        });
        toast.success("Session settings updated");
      },
      onError: (err) => toast.error(`Failed to save settings: ${err.message}`),
    })
  );

  // Assets queries to populate the wizard selectors on interrupt
  const { data: projects } = useQuery(trpc.projects.list.queryOptions());
  const { data: avatars } = useQuery(trpc.avatars.getAll.queryOptions({}));
  const { data: voices } = useQuery(trpc.voices.getAll.queryOptions({}));
  const { data: scripts } = useQuery(trpc.scripts.list.queryOptions());

  // State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentUIMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Model settings state
  const [selectedModel, setSelectedModel] = useState("meta-llama/llama-3.3-70b-instruct:free");
  const [selectedProvider, setSelectedProvider] = useState("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState(0.5);

  // Active interrupt state for parameter form
  const [activeInterrupt, setActiveInterrupt] = useState<{
    toolCall: any;
    sessionId: string;
  } | null>(null);

  // Parameter editor form fields (specifically for video_render tool approval)
  const [videoTitle, setVideoTitle] = useState("");
  const [videoProject, setVideoProject] = useState("");
  const [videoAvatar, setVideoAvatar] = useState("");
  const [videoVoice, setVideoVoice] = useState("");
  const [videoScript, setVideoScript] = useState("");

  // Ref to store AbortController for stream cancellation (Phase 2.2)
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any active stream on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  // Cancel any active stream on thread change
  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [activeSessionId]);

  // Load thread messages when selection changes
  const { data: initialMessages, isLoading: isLoadingMessages } = useQuery(
    trpc.agent.getMessages.queryOptions(
      { sessionId: activeSessionId! },
      { enabled: !!activeSessionId }
    )
  );

  useEffect(() => {
    if (initialMessages) {
      const formatted: AgentUIMessage[] = initialMessages.map((m: any) => ({
        id: m.id,
        role: m.role as AgentUIMessage["role"],
        content: m.content,
        reasoning: m.metadata?.reasoning || "",
        toolCalls: m.metadata?.toolCalls || undefined,
        toolResults: m.metadata?.toolResults || undefined,
        interrupt: m.metadata?.interrupt || undefined,
      }));
      setMessages(formatted);

      // Find the last message that contains an active interrupt
      const lastMsgWithInterrupt = formatted.slice().reverse().find((m) => m.interrupt);
      if (lastMsgWithInterrupt?.interrupt) {
        const tc = lastMsgWithInterrupt.interrupt.toolCall;
        setActiveInterrupt(lastMsgWithInterrupt.interrupt);

        // Pre-fill parameters editor wizard state for generate_video
        if (tc.name === "generate_video") {
          setVideoTitle(tc.args.title || "Untitled Co-Produced Video");
          setVideoProject(tc.args.projectId || "");
          setVideoAvatar(tc.args.avatarId || "");
          setVideoVoice(tc.args.voiceId || "");
          setVideoScript(tc.args.scriptId || "");
        }
      } else {
        setActiveInterrupt(null);
      }
    }
  }, [initialMessages]);

  // Set initial settings state when active session changes
  useEffect(() => {
    if (activeSessionId && sessions) {
      const activeSession = sessions.find((s: any) => s.id === activeSessionId);
      if (activeSession) {
        const settings = (activeSession as any).settings || {};
        setSelectedModel(settings.model || "meta-llama/llama-3.3-70b-instruct:free");
        setSelectedProvider(settings.provider || "openrouter");
        setApiKey(settings.apiKey || "");
        setTemperature(settings.temperature !== undefined ? settings.temperature : 0.5);
      }
    }
  }, [activeSessionId, sessions]);

  // Save settings updates and save to tRPC dynamically (auto-save on change)
  const updateSettings = (updates: {
    provider?: string;
    model?: string;
    apiKey?: string;
    temperature?: number;
  }) => {
    const nextProvider = updates.provider !== undefined ? updates.provider : selectedProvider;
    const nextModel = updates.model !== undefined ? updates.model : selectedModel;
    const nextApiKey = updates.apiKey !== undefined ? updates.apiKey : apiKey;
    const nextTemp = updates.temperature !== undefined ? updates.temperature : temperature;

    if (updates.provider !== undefined) setSelectedProvider(updates.provider);
    if (updates.model !== undefined) setSelectedModel(updates.model);
    if (updates.apiKey !== undefined) setApiKey(updates.apiKey);
    if (updates.temperature !== undefined) setTemperature(updates.temperature);

    if (activeSessionId) {
      saveSettingsMutation.mutate({
        sessionId: activeSessionId,
        settings: {
          model: nextModel,
          provider: nextProvider,
          apiKey: nextApiKey || undefined,
          temperature: nextTemp,
        },
      });
    }
  };

  // Save BYOK / Model Settings (manual fallback)
  const handleSaveSettings = () => {
    if (!activeSessionId) return;
    saveSettingsMutation.mutate({
      sessionId: activeSessionId,
      settings: {
        model: selectedModel,
        provider: selectedProvider,
        apiKey: apiKey || undefined,
        temperature,
      },
    });
  };

  // Helper to handle SSE stream reading
  const readSSEStream = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    // Clear active interrupt to start fresh
    setActiveInterrupt(null);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const block of lines) {
        if (!block.trim()) continue;

        // Parse SSE block: split into individual field lines
        // A block may be:  "event: error\ndata: {...}"  OR just  "data: {...}"
        const blockLines = block.split("\n");
        let eventType = "message";
        let dataPayload = "";

        for (const fieldLine of blockLines) {
          if (fieldLine.startsWith("event: ")) {
            eventType = fieldLine.slice(7).trim();
          } else if (fieldLine.startsWith("data: ")) {
            dataPayload = fieldLine.slice(6).trim();
          }
        }

        if (!dataPayload || dataPayload === "{}") continue;

        // Handle error events regardless of whether they carry event:error or data.error
        if (eventType === "error") {
          try {
            const errData = JSON.parse(dataPayload);
            const errMsg = errData.error || dataPayload;
            const shortErr = errMsg.split(":").slice(0, 2).join(":").trim();
            toast.error(shortErr, { duration: 6000 });
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant" as const,
                content: errMsg,
                isError: true,
              },
            ]);
          } catch {
            toast.error("Stream error", { duration: 6000 });
          }
          continue;
        }

        {
          // Normal data event
          const line = dataPayload;
          try {
            const data = JSON.parse(line);

            if (data.error) {
              const shortErr = data.error.split(":").slice(0, 2).join(":").trim();
              toast.error(shortErr, { duration: 6000 });
              setMessages((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  role: "assistant" as const,
                  content: data.error,
                  isError: true,
                },
              ]);
              continue;
            }

            if (data.type === "reasoning") {
              setMessages((prev) => {
                const lastIndex = prev.length - 1;
                if (lastIndex >= 0 && prev[lastIndex].role === "assistant") {
                  return prev.map((msg, idx) =>
                    idx === lastIndex
                      ? { ...msg, reasoning: (msg.reasoning || "") + data.text }
                      : msg
                  );
                } else {
                  return [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      role: "assistant" as const,
                      content: "",
                      reasoning: data.text,
                    },
                  ];
                }
              });
            } else if (data.type === "token" || data.type === "text") {
              setMessages((prev) => {
                const lastIndex = prev.length - 1;
                if (lastIndex >= 0 && prev[lastIndex].role === "assistant") {
                  return prev.map((msg, idx) =>
                    idx === lastIndex
                      ? { ...msg, content: msg.content + data.text }
                      : msg
                  );
                } else {
                  return [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      role: "assistant" as const,
                      content: data.text,
                      reasoning: "",
                    },
                  ];
                }
              });
            } else if (data.type === "tool_calls") {
              setMessages((prev) => {
                const lastIndex = prev.length - 1;
                // Immutable update (Phase 4.1)
                if (lastIndex >= 0 && prev[lastIndex].role === "assistant") {
                  return prev.map((msg, idx) =>
                    idx === lastIndex
                      ? { ...msg, toolCalls: [...(msg.toolCalls || []), ...data.tool_calls] }
                      : msg
                  );
                } else {
                  return [
                    ...prev,
                    {
                      id: crypto.randomUUID(), // Phase 4.2
                      role: "assistant" as const,
                      content: "",
                      toolCalls: data.tool_calls,
                    },
                  ];
                }
              });
            } else if (data.type === "tool_result") {
              setMessages((prev) => {
                return prev.map((msg) => {
                  if (msg.role === "assistant" && msg.toolCalls?.some((tc: any) => tc.id === data.tool_call_id)) {
                    return {
                      ...msg,
                      toolResults: {
                        ...(msg.toolResults || {}),
                        [data.tool_call_id]: {
                          name: data.name,
                          result: data.result,
                        },
                      },
                    };
                  }
                  return msg;
                });
              });
            } else if (data.type === "interrupt") {
              const tc = data.data.toolCall;
              setActiveInterrupt({
                toolCall: tc,
                sessionId: data.data.sessionId,
              });

              // Pre-fill parameters editor wizard state
              if (tc.name === "generate_video") {
                setVideoTitle(tc.args.title || "Untitled Co-Produced Video");
                setVideoProject(tc.args.projectId || "");
                setVideoAvatar(tc.args.avatarId || "");
                setVideoVoice(tc.args.voiceId || "");
                setVideoScript(tc.args.scriptId || "");
              }

              // Append interrupt marker to messages list so user has context in chat
              setMessages((prev) => {
                return prev.map((msg, idx) =>
                  idx === prev.length - 1 && msg.role === "assistant"
                    ? {
                        ...msg,
                        interrupt: {
                          toolCall: tc,
                          sessionId: data.data.sessionId,
                        },
                      }
                    : msg
                );
              });
            }
          } catch (e) {
            console.error("Malformed SSE JSON:", e);
          }
        }
      }
    }
  };

  // Submit Prompt to Stream API
  const handleSubmitPrompt = async (
    message: PromptInputMessage,
    _event: FormEvent<HTMLFormElement>
  ) => {
    const userPrompt = message.text?.trim();
    if (!activeSessionId || !userPrompt || isGenerating) return;

    setIsGenerating(true);

    // Optimistically push user message
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(), // Phase 4.2
        role: "user" as const,
        content: userPrompt,
      },
    ]);

    // Create fresh AbortController (Phase 2.2)
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          sessionId: activeSessionId,
          content: userPrompt,
          settings: {
            model: selectedModel,
            provider: selectedProvider,
            apiKey: apiKey || undefined,
            temperature,
          },
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || "Failed to initialize stream");
      }

      await readSSEStream(response);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Stream aborted successfully");
        return;
      }
      const errMsg = err instanceof Error ? err.message : "An error occurred during chat generation";
      toast.error(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(), // Phase 4.2
          role: "assistant" as const,
          content: `Error: ${errMsg}`,
        },
      ]);
    } finally {
      setIsGenerating(false);
      if (activeSessionId) {
        queryClient.invalidateQueries({
          queryKey: trpc.agent.getMessages.queryKey({ sessionId: activeSessionId }),
        });
      }
    }
  };

  // Handle Tool Interruption approvals / parameter editing
  const handleApproveInterrupt = async (action: "continue" | "update" | "feedback") => {
    if (!activeSessionId || !activeInterrupt) return;

    setIsGenerating(true);
    const resumeData = 
      action === "update" 
        ? {
            title: videoTitle,
            projectId: videoProject,
            avatarId: videoAvatar,
            voiceId: videoVoice,
            scriptId: videoScript,
          }
        : action === "feedback"
        ? "Action rejected by user in Copilot Studio."
        : activeInterrupt.toolCall.args;

    // Clear interrupt state
    setActiveInterrupt(null);
    setMessages((prev) => {
      return prev.map((msg) => {
        if (msg.interrupt) {
          const { interrupt, ...rest } = msg;
          return rest;
        }
        return msg;
      });
    });

    // Create fresh AbortController (Phase 2.2)
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/agent/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          sessionId: activeSessionId,
          action,
          data: resumeData,
          settings: {
            model: selectedModel,
            provider: selectedProvider,
            apiKey: apiKey || undefined,
            temperature,
          },
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || "Resumption request failed");
      }

      await readSSEStream(response);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Stream aborted successfully");
        return;
      }
      const errMsg = err instanceof Error ? err.message : "Failed to resume executor";
      toast.error(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(), // Phase 4.2
          role: "assistant" as const,
          content: `Resumption Error: ${errMsg}`,
        },
      ]);
    } finally {
      setIsGenerating(false);
      if (activeSessionId) {
        queryClient.invalidateQueries({
          queryKey: trpc.agent.getMessages.queryKey({ sessionId: activeSessionId }),
        });
      }
    }
  };

  const createNewThread = () => {
    const defaultTitle = `Thread ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    createSessionMutation.mutate({ title: defaultTitle });
  };

  const renderInterrupt = (msg: AgentUIMessage) => {
    if (!msg.interrupt) return null;
    return (
      <InterruptWizard
        interrupt={msg.interrupt}
        onApprove={handleApproveInterrupt}
        isGenerating={isGenerating}
        projects={projects}
        avatars={avatars}
        voices={voices}
        scripts={scripts}
        videoTitle={videoTitle}
        setVideoTitle={setVideoTitle}
        videoProject={videoProject}
        setVideoProject={setVideoProject}
        videoAvatar={videoAvatar}
        setVideoAvatar={setVideoAvatar}
        videoVoice={videoVoice}
        setVideoVoice={setVideoVoice}
        videoScript={videoScript}
        setVideoScript={setVideoScript}
      />
    );
  };

  return (
    <div className="flex h-[calc(100vh-0rem)] w-full overflow-hidden bg-background">
      {/* 1. Left Sidebar (Threads & Settings) */}
      <ThreadSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectThread={setActiveSessionId}
        onCreateThread={createNewThread}
        onDeleteThread={(id) => deleteSessionMutation.mutate({ id })}
        isLoadingSessions={isLoadingSessions}
        isCreatingSession={createSessionMutation.isPending}
        isGenerating={isGenerating}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        settingsChild={
          <SettingsPanel
            activeSessionId={activeSessionId}
            selectedProvider={selectedProvider}
            setSelectedProvider={setSelectedProvider}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            apiKey={apiKey}
            setApiKey={setApiKey}
            temperature={temperature}
            setTemperature={setTemperature}
            onSave={handleSaveSettings}
            isSaving={saveSettingsMutation.isPending}
          />
        }
      />

      {/* 2. Main Conversation Arena */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {!activeSessionId ? (
          <ConversationEmptyState
            title="Co-Producer Agent Studio"
            description="Welcome to Mimic AI. Prompt the AI Copilot to coordinate project management, scripts editing, voice cloning quality validation, and render your dynamic avatars video pipeline instantly."
            icon={<Sparkles className="size-12 text-emerald-500 animate-pulse" />}
          >
            <div className="max-w-md mx-auto grid grid-cols-2 gap-3 mt-6 text-xs font-outfit">
              <div
                onClick={createNewThread}
                className="p-4 border rounded-xl bg-muted/10 hover:bg-muted/30 cursor-pointer text-left transition-all hover:scale-[1.02] border-emerald-500/10"
              >
                <div className="font-semibold text-emerald-500 mb-1">Create Video Draft</div>
                <div className="text-muted-foreground">
                  &quot;Generate a 1080p project video with Alex&apos;s cloned voice and avatar&quot;
                </div>
              </div>
              <div
                onClick={createNewThread}
                className="p-4 border rounded-xl bg-muted/10 hover:bg-muted/30 cursor-pointer text-left transition-all hover:scale-[1.02] border-emerald-500/10"
              >
                <div className="font-semibold text-emerald-500 mb-1">Scriptwriting</div>
                <div className="text-muted-foreground">
                  &quot;Write a casual script about productivity hacks in Workspace Alpha&quot;
                </div>
              </div>
            </div>
          </ConversationEmptyState>
        ) : (
          <>
            {/* Header displaying active session & model info */}
            <div className="flex items-center justify-between border-b px-6 py-3.5 bg-muted/5 font-outfit">
              <div>
                <h3 className="font-semibold text-sm">Active Thread</h3>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5">
                  <Cpu className="size-3" />
                  <span>
                    {selectedProvider} / {selectedModel} (temp: {temperature})
                  </span>
                </p>
              </div>
              {isGenerating && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-medium">
                  <Loader2 className="size-3 animate-spin" />
                  <span>Copilot thinking...</span>
                </div>
              )}
            </div>

             {/* Scrolling chat messages list wrapped in error boundary (Phase 4.3) */}
            <AgentErrorBoundary>
              <MessageList
                messages={messages}
                isLoadingMessages={isLoadingMessages}
                isGenerating={isGenerating}
                renderInterrupt={renderInterrupt}
              />
            </AgentErrorBoundary>

            {/* Fixed Chat Prompt Input Container */}
            <ChatInput
              onSubmit={handleSubmitPrompt}
              isGenerating={isGenerating}
              hasApiKey={!!apiKey.trim()}
              onShowSettings={() => setShowSettings(true)}
              activeInterrupt={!!activeInterrupt}
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              apiKey={apiKey}
              temperature={temperature}
              updateSettings={updateSettings}
            />
          </>
        )}
      </div>
    </div>
  );
}
