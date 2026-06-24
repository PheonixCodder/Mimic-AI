import { NextRequest } from "next/server";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { getAgent } from "@/features/agent/lib";
import { insforgeAdmin } from "@/lib/insforge/admin";
import { Command } from "@langchain/langgraph";
import { streamAgentExecution } from "@/features/agent/lib/stream-sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1. Authenticate user
  const ssrClient = await createInsForgeServerClient();
  const { data: authData, error: authError } = await ssrClient.auth.getCurrentUser();
  if (authError || !authData?.user) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Parse payload
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "BAD_REQUEST", message: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { sessionId, action, data, settings } = body;
  if (!sessionId || !action) {
    return new Response(JSON.stringify({ error: "BAD_REQUEST", message: "sessionId and action are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Verify workspace access
  const { data: session, error: sessionError } = await insforgeAdmin.database
    .from("agent_sessions")
    .select("workspace_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return new Response(JSON.stringify({ error: "NOT_FOUND", message: "Session not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: isMember } = await insforgeAdmin.database
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", session.workspace_id)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!isMember) {
    return new Response(JSON.stringify({ error: "FORBIDDEN", message: "Access denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = authData.user.id;
  const workspaceId = session.workspace_id;

  // 4. Save User action log to message history if feedback was provided
  if (action === "feedback" && data) {
    await insforgeAdmin.database.from("agent_messages").insert([
      {
        session_id: sessionId,
        role: "user",
        content: typeof data === "string" ? data : `[Feedback on critical action]: ${JSON.stringify(data)}`,
      }
    ]);
  }

  // 5. Load model configurations (BYOK — user must supply their own key)
  const model = settings?.model || "meta-llama/llama-3.3-70b-instruct:free";
  const provider = settings?.provider || "openrouter";
  const apiKey = settings?.apiKey;
  const temperature = settings?.temperature !== undefined ? Number(settings.temperature) : 0.5;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "BAD_REQUEST", message: "An API key is required. Please add your key in the BYOK settings panel." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      controller.enqueue(encoder.encode(": connected\n\n"));

      (async () => {
        let cleanupFn = async () => {};
        try {
          // Initialize and build graph
          const { agent, cleanup } = await getAgent({
            userId,
            workspaceId,
            model,
            provider,
            apiKey,
            temperature,
          });
          cleanupFn = cleanup;

          // Resume graph with Command
          const inputs = new Command({
            resume: {
              action,
              data,
            },
          });

          await streamAgentExecution({
            agent,
            inputs,
            sessionId,
            model,
            provider,
            send,
            isResumption: true,
          });

          controller.enqueue(encoder.encode("event: done\n"));
          controller.enqueue(encoder.encode("data: {}\n\n"));
        } catch (err: any) {
          console.error("SSE resumption stream error:", err);
          let errorMessage = err?.message || "Internal stream error";
          const errStr = (String(err) + " " + String(errorMessage)).toLowerCase();

          if (errStr.includes("recursion limit")) {
            errorMessage = "Execution aborted: The agent exceeded its recursion step limit. This loop is typically caused by a smaller model (like 1.2B or 3B) struggling to parse tool outputs and repeatedly calling the same tool. Please select a larger model (e.g. Llama 3.3 70B) in your session settings for stable tool execution.";
          } else if (err?.code === 401 || err?.name === "OpenRouterAuthError" || errStr.includes("autherror") || errStr.includes("missing authentication header") || errStr.includes("api key is wrong") || errStr.includes("unauthorized") || errStr.includes("authentication")) {
            errorMessage = "Authentication failed: The provided API key is invalid or has expired. Please verify your OpenRouter / BYOK API key in the settings panel (bottom right slider).";
          } else if (err?.code === "EAI_AGAIN" || errStr.includes("eai_again") || errStr.includes("getaddrinfo") || errStr.includes("database.insforge.app")) {
            errorMessage = "Database connection failed: The database host could not be resolved. This is usually due to a temporary network offline state or DNS resolution issue. Please check your internet connection and try again.";
          } else if (err?.code === 429 || err?.name === "OpenRouterRateLimitError" || errStr.includes("rate-limited") || errStr.includes("429") || errStr.includes("rate limit")) {
            errorMessage = "Rate limit exceeded: Upstream model is temporarily rate-limited. Please wait a moment and try again, or add your own custom API key in the settings panel to utilize your own rate limits.";
          } else if (errStr.includes("emptymodelresponse") || errStr.includes("model output must contain") || errStr.includes("both be empty")) {
            errorMessage = "Empty model response: The selected model returned no content after 3 retries. This typically happens with very small or unstable models. Please try selecting a larger or more capable model (e.g. Llama 3.3 70B or Gemini Flash) in the session settings.";
          }

          controller.enqueue(encoder.encode("event: error\n"));
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
        } finally {
          await cleanupFn();
          controller.close();
        }
      })();
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
