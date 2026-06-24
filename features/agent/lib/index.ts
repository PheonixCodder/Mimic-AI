import { createChatModel } from "./util";
import { postgresCheckpointer } from "./memory";
import { createWorkspaceTools } from "./tools";
import { getMCPTools } from "./mcp";
import { AgentBuilder } from "./builder";
import { ensureDefaultSkills, createLoadSkillTool } from "./skills";
import { createHash } from "crypto";

let setupPromise: Promise<void> | null = null;

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

interface CacheEntry {
  agent: any;
  cleanup: () => Promise<void>;
  expiresAt: number;
}

const agentCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 1 minute

if (typeof global !== "undefined") {
  const intervalId = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of agentCache.entries()) {
      if (now >= entry.expiresAt) {
        entry.cleanup().catch((err) =>
          console.error("Error during cache eviction cleanup:", err)
        );
        agentCache.delete(key);
      }
    }
  }, 30_000);
  
  if (intervalId && typeof intervalId.unref === "function") {
    intervalId.unref();
  }
}

/**
 * Initializes checkpointer tables and seeds default workspace skills once.
 */
async function setupOnce(workspaceId: string) {
  if (!setupPromise) {
    setupPromise = (async () => {
      // Set up LangGraph database tables
      await postgresCheckpointer.setup();
      // Seed default workspace skills
      await ensureDefaultSkills(workspaceId);
    })().catch((err) => {
      setupPromise = null;
      console.error("Failed to initialize agent checkpointer or skills:", err);
      throw err;
    });
  }
  await setupPromise;
}

export interface GetAgentOptions {
  userId: string;
  workspaceId: string;
  model: string;
  provider: string;
  apiKey: string;
  temperature?: number;
  systemPrompt?: string;
  approveAllTools?: boolean;
}

/**
 * Verifies database readiness and returns a compiled LangGraph agent executor instance.
 */
export async function getAgent(opts: GetAgentOptions): Promise<{
  agent: any;
  cleanup: () => Promise<void>;
}> {
  // Ensure the database checkpointer and default skills exist
  await setupOnce(opts.workspaceId);

  const keyHash = hashKey(opts.apiKey || "");
  const cacheKey = `${opts.workspaceId}:${opts.provider}:${opts.model}:${keyHash}`;

  const cached = agentCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    // Reset expiration on access to keep warm
    cached.expiresAt = Date.now() + CACHE_TTL_MS;
    return { agent: cached.agent, cleanup: async () => {} };
  }

  // Evict old cached entry if exists
  if (cached) {
    cached.cleanup().catch((err) =>
      console.error("Error evicting expired agent:", err)
    );
    agentCache.delete(cacheKey);
  }

  // Initialize the BYOK chat model instance
  const llm = createChatModel({
    provider: opts.provider,
    model: opts.model,
    apiKey: opts.apiKey,
    temperature: opts.temperature,
  });

  // Load the complete toolset
  const workspaceTools = createWorkspaceTools(opts.userId, opts.workspaceId);
  const loadSkillTool = createLoadSkillTool(opts.workspaceId);
  const { tools: mcpTools, cleanup } = await getMCPTools(opts.workspaceId);

  const allTools = [...workspaceTools, loadSkillTool, ...mcpTools];

  // Default Co-Producer system prompt
  const defaultPrompt = `You are a video Co-Producer assistant.
Your job is to help the user orchestrate workspace assets (generating scripts, estimating costs, validation pipelines, rendering videos, and checking jobs metrics).

You operate progressively: if you need details on scripting, rendering, or metrics, call the 'load_skill' tool for that specific topic on-demand.
Do NOT guess UUIDs or parameters. If you don't know them, query or list them first.
`;

  // Compile the low-level graph
  const agent = new AgentBuilder({
    llm,
    tools: allTools,
    prompt: opts.systemPrompt || defaultPrompt,
    checkpointer: postgresCheckpointer,
    approveAllTools: opts.approveAllTools || false,
  }).build();

  agentCache.set(cacheKey, {
    agent,
    cleanup,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return { agent, cleanup: async () => {} };
}
