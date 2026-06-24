import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { insforgeAdmin } from "@/lib/insforge/admin";
import { sanitizeTool } from "./util";
import { DynamicStructuredTool } from "@langchain/core/tools";

interface StdioMCPServerConfig {
  transport: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface HttpMCPServerConfig {
  transport: "http";
  url: string;
  headers?: Record<string, string>;
}

type MCPServerConfig = StdioMCPServerConfig | HttpMCPServerConfig;

/**
 * Fetches enabled MCP server configurations for a specific workspace.
 */
export async function getMCPServerConfigs(workspaceId: string): Promise<Record<string, MCPServerConfig>> {
  try {
    const { data: servers, error } = await insforgeAdmin.database
      .from("agent_mcp_servers")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("enabled", true);

    if (error || !servers) {
      console.error("Failed to query MCP servers:", error?.message);
      return {};
    }

    const configs: Record<string, MCPServerConfig> = {};

    for (const server of servers) {
      if (server.type === "stdio" && server.command) {
        const config: StdioMCPServerConfig = {
          transport: "stdio",
          command: server.command,
        };

        if (server.args && Array.isArray(server.args)) {
          config.args = (server.args as unknown[]).filter((arg: unknown): arg is string => typeof arg === "string");
        }
        if (server.env && typeof server.env === "object" && server.env !== null) {
          config.env = server.env as Record<string, string>;
        }

        configs[server.name] = config;
      } else if (server.type === "http" && server.url) {
        const config: HttpMCPServerConfig = {
          transport: "http",
          url: server.url,
        };

        if (server.headers && typeof server.headers === "object" && server.headers !== null) {
          config.headers = server.headers as Record<string, string>;
        }

        configs[server.name] = config;
      }
    }

    return configs;
  } catch (error) {
    console.error("Failed to parse MCP configs:", error);
    return {};
  }
}

/**
 * Gets tools from registered MCP servers for a workspace.
 */
export async function getMCPTools(workspaceId: string): Promise<{
  tools: DynamicStructuredTool[];
  cleanup: () => Promise<void>;
}> {
  try {
    const mcpServers = await getMCPServerConfigs(workspaceId);

    if (Object.keys(mcpServers).length === 0) {
      return { tools: [], cleanup: async () => {} };
    }

    const client = new MultiServerMCPClient({
      mcpServers: mcpServers as any,
      throwOnLoadError: false,
      prefixToolNameWithServerName: true,
    });

    const tools = await client.getTools();
    
    // Sanitize schemas for Gemini compatibility
    const sanitizedTools = tools.map((tool) => sanitizeTool(tool as DynamicStructuredTool));
    
    return {
      tools: sanitizedTools,
      cleanup: async () => {
        try {
          await client.close();
        } catch (err) {
          console.error("Failed to close MCP client:", err);
        }
      }
    };
  } catch (error) {
    console.error("Failed to connect to MCP client or fetch tools:", error);
    return { tools: [], cleanup: async () => {} };
  }
}
