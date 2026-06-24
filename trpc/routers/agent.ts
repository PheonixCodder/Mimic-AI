import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, workspaceProcedure } from "../init";

type SessionRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  settings: any;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  metadata: any;
  created_at: string;
};

export const agentRouter = createTRPCRouter({
  // 1. List threads/sessions
  listSessions: workspaceProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.insforge.database
      .from("agent_sessions")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }

    const rows = (data ?? []) as SessionRow[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      settings: r.settings || {},
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }),

  // 2. Create new session thread
  createSession: workspaceProcedure
    .input(z.object({ title: z.string().trim().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("agent_sessions")
        .insert([
          {
            workspace_id: ctx.workspace.id,
            created_by: ctx.user.id,
            title: input.title,
            settings: {},
          }
        ])
        .select()
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message || "Failed to create agent session",
        });
      }

      const r = data as SessionRow;
      return {
        id: r.id,
        title: r.title,
        settings: r.settings || {},
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    }),

  // 3. Delete session thread
  deleteSession: workspaceProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify session exists in active workspace
      const { data: session } = await ctx.insforge.database
        .from("agent_sessions")
        .select("id")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .maybeSingle();

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const { error } = await ctx.insforge.database
        .from("agent_sessions")
        .delete()
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return { success: true };
    }),

  // 4. Get chat history for a session
  getMessages: workspaceProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Validate session workspace
      const { data: session } = await ctx.insforge.database
        .from("agent_sessions")
        .select("id")
        .eq("id", input.sessionId)
        .eq("workspace_id", ctx.workspace.id)
        .maybeSingle();

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const { data, error } = await ctx.insforge.database
        .from("agent_messages")
        .select("*")
        .eq("session_id", input.sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      const rows = (data ?? []) as MessageRow[];
      return rows.map((r) => ({
        id: r.id,
        role: r.role,
        content: r.content,
        metadata: r.metadata || null,
        createdAt: r.created_at,
      }));
    }),

  // 5. Update session configurations (BYOK & Model settings)
  saveSettings: workspaceProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      settings: z.object({
        model: z.string().min(1),
        provider: z.string().min(1),
        apiKey: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
      })
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate session workspace
      const { data: session } = await ctx.insforge.database
        .from("agent_sessions")
        .select("id")
        .eq("id", input.sessionId)
        .eq("workspace_id", ctx.workspace.id)
        .maybeSingle();

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const { error } = await ctx.insforge.database
        .from("agent_sessions")
        .update({ settings: input.settings })
        .eq("id", input.sessionId);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return { success: true };
    })
});
