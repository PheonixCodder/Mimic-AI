import { insforgeAdmin } from "@/lib/insforge/admin";

export interface StreamAgentOptions {
  agent: any;
  inputs: any;
  sessionId: string;
  model: string;
  provider: string;
  send: (data: any) => void;
  isResumption?: boolean;
}

export async function streamAgentExecution({
  agent,
  inputs,
  sessionId,
  model,
  provider,
  send,
  isResumption,
}: StreamAgentOptions) {
  let accumulatedText = "";
  let accumulatedReasoning = "";
  const accumulatedToolCalls: any[] = [];
  const accumulatedToolResults: Record<string, { name: string; result: any }> = {};

  const eventStream = await agent.stream(inputs, {
    streamMode: ["updates"],
    recursionLimit: 45, // Protect against infinite model loops (especially on small models)
    configurable: {
      thread_id: sessionId,
      onToken: (token: string) => {
        accumulatedText += token;
        send({ type: "token", text: token });
      },
      onReasoning: (reasoning: string) => {
        accumulatedReasoning += reasoning;
        send({ type: "reasoning", text: reasoning });
      },
    },
  });

  for await (const chunk of eventStream) {
    if (!chunk) continue;

    if (Array.isArray(chunk) && chunk.length === 2 && chunk[0] === "updates") {
      const updateData = chunk[1] as any;

      // Handle agent node updates (only capture tool calls, text is streamed via onToken)
      if (updateData?.agent?.messages) {
        const messages = Array.isArray(updateData.agent.messages)
          ? updateData.agent.messages
          : [updateData.agent.messages];

        for (const msg of messages) {
          if (msg?.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
            accumulatedToolCalls.push(...msg.tool_calls);
            send({ type: "tool_calls", tool_calls: msg.tool_calls });
          }
        }
      }

      // Handle tool completion logs
      if (updateData?.tools?.messages) {
        const toolMsgs = Array.isArray(updateData.tools.messages)
          ? updateData.tools.messages
          : [updateData.tools.messages];

        for (const tm of toolMsgs) {
          accumulatedToolResults[tm.tool_call_id] = {
            name: tm.name,
            result: tm.content,
          };
          send({
            type: "tool_result",
            tool_call_id: tm.tool_call_id,
            name: tm.name,
            result: tm.content,
          });
        }
      }
    }
  }

  // Check for human-in-the-loop interruption state
  const state = await agent.getState({ configurable: { thread_id: sessionId } });
  let interrupt: any = undefined;
  if (state.next && state.next.includes("tool_approval")) {
    const lastTask = state.tasks[state.tasks.length - 1];
    const interruptValue = lastTask?.interrupts?.[0]?.value;
    const toolCall = interruptValue?.toolCall;

    if (toolCall) {
      interrupt = {
        toolCall,
        sessionId,
      };
    }
  }

  // Save or update assistant text response in DB history
  const hasUpdates =
    accumulatedText.trim() ||
    accumulatedReasoning.trim() ||
    accumulatedToolCalls.length > 0 ||
    Object.keys(accumulatedToolResults).length > 0;

  if (hasUpdates) {
    if (isResumption) {
      // Fetch the last assistant message for this session to update it inline
      const { data: lastMessages } = await insforgeAdmin.database
        .from("agent_messages")
        .select("*")
        .eq("session_id", sessionId)
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(1);

      const lastMessage = lastMessages?.[0];
      if (lastMessage) {
        const oldContent = lastMessage.content || "";
        const newContent = oldContent + (accumulatedText ? (oldContent ? "\n" : "") + accumulatedText : "");

        const oldMetadata = lastMessage.metadata || {};
        const oldReasoning = oldMetadata.reasoning || "";
        const newReasoning = oldReasoning + (accumulatedReasoning ? (oldReasoning ? "\n" : "") + accumulatedReasoning : "");

        const newToolCalls = [
          ...(oldMetadata.toolCalls || []),
          ...accumulatedToolCalls
        ];
        const newToolResults = {
          ...(oldMetadata.toolResults || {}),
          ...accumulatedToolResults
        };

        await insforgeAdmin.database
          .from("agent_messages")
          .update({
            content: newContent,
            metadata: {
              ...oldMetadata,
              model,
              provider,
              reasoning: newReasoning || undefined,
              toolCalls: newToolCalls.length > 0 ? newToolCalls : undefined,
              toolResults: Object.keys(newToolResults).length > 0 ? newToolResults : undefined,
              interrupt: interrupt || null,
            },
          })
          .eq("id", lastMessage.id);
      } else {
        // Fallback to insert if no previous assistant message was found
        await insforgeAdmin.database.from("agent_messages").insert([
          {
            session_id: sessionId,
            role: "assistant",
            content: accumulatedText,
            metadata: {
              model,
              provider,
              reasoning: accumulatedReasoning || undefined,
              toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
              toolResults: Object.keys(accumulatedToolResults).length > 0 ? accumulatedToolResults : undefined,
              interrupt: interrupt || undefined,
            },
          },
        ]);
      }
    } else {
      // Normal flow: insert a brand new assistant message
      await insforgeAdmin.database.from("agent_messages").insert([
        {
          session_id: sessionId,
          role: "assistant",
          content: accumulatedText,
          metadata: {
            model,
            provider,
            reasoning: accumulatedReasoning || undefined,
            toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
            toolResults: Object.keys(accumulatedToolResults).length > 0 ? accumulatedToolResults : undefined,
            interrupt: interrupt || undefined,
          },
        },
      ]);
    }
  } else if (isResumption) {
    // If there were no updates but we resumed, we still want to make sure the last message's active interrupt is cleared
    const { data: lastMessages } = await insforgeAdmin.database
      .from("agent_messages")
      .select("*")
      .eq("session_id", sessionId)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(1);

    const lastMessage = lastMessages?.[0];
    if (lastMessage) {
      const oldMetadata = lastMessage.metadata || {};
      await insforgeAdmin.database
        .from("agent_messages")
        .update({
          metadata: {
            ...oldMetadata,
            interrupt: interrupt || null,
          },
        })
        .eq("id", lastMessage.id);
    }
  }

  // If there was an interrupt, send it to the client
  if (interrupt) {
    send({
      type: "interrupt",
      data: interrupt,
    });
  }
}
