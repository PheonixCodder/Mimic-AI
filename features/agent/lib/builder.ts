import {
  StateGraph,
  MessagesAnnotation,
  END,
  START,
  BaseCheckpointSaver,
  interrupt,
  Command,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { SystemMessage, ToolMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { DynamicStructuredTool } from "@langchain/core/tools";

export class AgentBuilder {
  private toolNode: ToolNode;
  private readonly model: BaseChatModel;
  private tools: DynamicStructuredTool[];
  private systemPrompt: string = "";
  private approveAllTools: boolean = false;
  private checkpointer?: BaseCheckpointSaver;

  constructor({
    tools,
    llm,
    prompt,
    checkpointer,
    approveAllTools = false,
  }: {
    tools: DynamicStructuredTool[];
    llm: BaseChatModel;
    prompt: string;
    checkpointer?: BaseCheckpointSaver;
    approveAllTools?: boolean;
  }) {
    if (!llm) {
      throw new Error("Language model (llm) is required");
    }
    this.tools = tools || [];
    this.toolNode = new ToolNode(tools || []);
    this.systemPrompt = prompt;
    this.model = llm;
    this.checkpointer = checkpointer;
    this.approveAllTools = approveAllTools;
  }

  /**
   * Router edge: decides if a tool call was emitted, routing to tool_approval or ending the run.
   */
  private shouldApproveTool(state: typeof MessagesAnnotation.State) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    if (
      "tool_calls" in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls?.length
    ) {
      return "tool_approval";
    }
    return END;
  }

  /**
   * Approval node: checks if the tool call is critical (like generate_video) and executes interrupt.
   * Skip verification for read-only actions or if approveAllTools is active.
   */
  private async approveToolCall(state: typeof MessagesAnnotation.State) {
    if (this.approveAllTools) {
      return new Command({ goto: "tools" });
    }

    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    
    if (
      "tool_calls" in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls?.length
    ) {
      const nonCriticalTools = new Set([
        "list_projects",
        "create_project",
        "list_scripts",
        "create_script",
        "list_avatars",
        "list_voices",
        "check_job_status",
        "load_skill",
      ]);

      // Find the first critical tool call in the batch
      const criticalCall = lastMessage.tool_calls.find(
        (tc: ToolCall) => !nonCriticalTools.has(tc.name)
      );

      // All non-critical -> auto-approve
      if (!criticalCall) {
        return new Command({ goto: "tools" });
      }

      // Critical tool triggers a LangGraph interrupt
      const humanReview = interrupt<
        {
          question: string;
          toolCall: ToolCall;
        },
        {
          action: "continue" | "update" | "feedback";
          data?: any; // Contains parameters or feedback text
        }
      >({
        question: `The agent is requesting to execute critical action "${criticalCall.name}". Please approve or edit parameters.`,
        toolCall: criticalCall,
      });

      const { action, data } = humanReview;

      if (action === "continue") {
        return new Command({ goto: "tools" });
      } else if (action === "update") {
        // Build updated tool call message with user-modified parameters
        const updatedMessage = {
          role: "ai",
          content: lastMessage.content,
          tool_calls: lastMessage.tool_calls.map((tc) =>
            tc.id === criticalCall.id
              ? { ...tc, args: data }
              : tc
          ),
          id: lastMessage.id,
        };

        return new Command({
          goto: "tools",
          update: { messages: [updatedMessage] },
        });
      } else if (action === "feedback") {
        // Send user feedback directly back to model as a ToolMessage
        const toolMessage = new ToolMessage({
          name: criticalCall.name,
          content: typeof data === "string" ? data : JSON.stringify(data),
          tool_call_id: criticalCall.id,
        });

        return new Command({
          goto: "agent",
          update: { messages: [toolMessage] },
        });
      }
    }

    throw new Error("Invalid tool call approval state");
  }

  /**
   * Invokes the LLM bound with tools and prepends the system prompt correctly.
   */
  private async callModel(state: typeof MessagesAnnotation.State, config?: any) {
    const messages = [
      new SystemMessage(this.systemPrompt),
      ...state.messages,
    ];
    
    if (!this.model.bindTools) {
      throw new Error("The selected model does not support tool binding.");
    }
    const modelWithTools = this.model.bindTools(this.tools);

    const onToken = config?.configurable?.onToken;
    const onReasoning = config?.configurable?.onReasoning;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const maxRetries = 3;
    let attempt = 0;

    while (true) {
      try {
        if (onToken || onReasoning) {
          const responseStream = await modelWithTools.stream(messages);
          let response: any = null;

          for await (const chunk of responseStream) {
            if (!response) {
              response = chunk;
            } else {
              response = response.concat(chunk);
            }

            if (chunk.content && typeof chunk.content === "string") {
              onToken?.(chunk.content);
            }

            const reasoning =
              chunk.additional_kwargs?.reasoning_content ||
              chunk.response_metadata?.reasoning_content ||
              (chunk as any).metadata?.reasoning_content ||
              (chunk as any).reasoning_content;

            if (reasoning && typeof reasoning === "string") {
              onReasoning?.(reasoning);
            }
          }

          // Guard: empty response (no content, no tool_calls)
          if (
            !response ||
            (!response.content && (!response.tool_calls || response.tool_calls.length === 0))
          ) {
            throw new Error("[EmptyModelResponse] model output must contain either output text or tool calls");
          }

          return { messages: [response] };
        } else {
          const response = await modelWithTools.invoke(messages);

          // Guard: empty response
          if (
            !response ||
            (!response.content && (!response.tool_calls || response.tool_calls.length === 0))
          ) {
            throw new Error("[EmptyModelResponse] model output must contain either output text or tool calls");
          }

          return { messages: response };
        }
      } catch (err: any) {
        attempt++;
        const errMsg = err?.message?.toLowerCase() || "";

        const isRateLimit =
          err?.status === 429 ||
          err?.code === 429 ||
          err?.name === "OpenRouterRateLimitError" ||
          errMsg.includes("rate-limited") ||
          errMsg.includes("429") ||
          errMsg.includes("rate limit");

        const isEmptyResponse =
          errMsg.includes("emptymodelresponse") ||
          errMsg.includes("model output must contain") ||
          errMsg.includes("both be empty");

        if (isRateLimit && attempt < maxRetries) {
          // Respect Retry-After header from upstream
          let retryDelay = 2000;
          if (err?.metadata?.retry_after_seconds) {
            retryDelay = Number(err.metadata.retry_after_seconds) * 1000;
          } else if (err?.headers?.["retry-after"]) {
            const headerSec = Number(err.headers["retry-after"]);
            if (!isNaN(headerSec)) retryDelay = headerSec * 1000;
          }
          retryDelay = Math.min(retryDelay, 12000);
          console.warn(`Rate limited upstream. Retrying in ${retryDelay}ms... (Attempt ${attempt}/${maxRetries})`);
          await delay(retryDelay);
          continue;
        }

        if (isEmptyResponse && attempt < maxRetries) {
          // Empty response — retry immediately with a short pause
          console.warn(`Empty model response. Retrying in 1000ms... (Attempt ${attempt}/${maxRetries})`);
          await delay(1000);
          continue;
        }
        // If not rate limit or max retries exceeded, rethrow
        throw err;
      }
    }
  }

  /**
   * Compiles the StateGraph into a runnable graph.
   */
  build() {
    const stateGraph = new StateGraph(MessagesAnnotation);
    stateGraph
      .addNode("agent", this.callModel.bind(this))
      .addNode("tools", this.toolNode)
      .addNode("tool_approval", this.approveToolCall.bind(this), {
        ends: ["tools", "agent"],
      })
      .addEdge(START, "agent")
      .addConditionalEdges("agent", this.shouldApproveTool.bind(this), ["tool_approval", END])
      .addEdge("tools", "agent");

    return stateGraph.compile({ checkpointer: this.checkpointer });
  }
}
