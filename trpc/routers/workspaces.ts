import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, workspaceProcedure } from "../init";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  polar_external_id: string | null;
  created_at: string;
  updated_at: string;
};

type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  active_workspace_id: string | null;
  email: string | null;
};

export const workspacesRouter = createTRPCRouter({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const { data: profiles, error: profileError } = await ctx.insforge.database
      .from("profiles")
      .select("*")
      .eq("user_id", ctx.user.id)
      .limit(1);

    if (profileError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: profileError.message,
      });
    }

    const profile = profiles?.[0] as ProfileRow | undefined;

    const { data: members, error: membersError } = await ctx.insforge.database
      .from("workspace_members")
      .select("*")
      .eq("user_id", ctx.user.id);

    if (membersError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: membersError.message,
      });
    }

    const memberRows = (members ?? []) as WorkspaceMemberRow[];

    if (memberRows.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No workspace found for user",
      });
    }

    const activeMember =
      memberRows.find((member) => member.workspace_id === profile?.active_workspace_id) ??
      memberRows[0];

    const { data: workspaces, error: workspaceError } = await ctx.insforge.database
      .from("workspaces")
      .select("*")
      .eq("id", activeMember.workspace_id)
      .limit(1);

    if (workspaceError || !workspaces?.[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: workspaceError?.message ?? "Workspace not found",
      });
    }

    return {
      workspace: workspaces[0] as WorkspaceRow,
      role: activeMember.role,
    };
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const { data: members, error: membersError } = await ctx.insforge.database
      .from("workspace_members")
      .select("*")
      .eq("user_id", ctx.user.id);

    if (membersError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: membersError.message,
      });
    }

    const memberRows = (members ?? []) as WorkspaceMemberRow[];
    const workspaceIds = memberRows.map((member) => member.workspace_id);

    if (workspaceIds.length === 0) {
      return [];
    }

    const { data: workspaces, error: workspaceError } = await ctx.insforge.database
      .from("workspaces")
      .select("*")
      .in("id", workspaceIds);

    if (workspaceError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: workspaceError.message,
      });
    }

    const workspaceRows = (workspaces ?? []) as WorkspaceRow[];

    return workspaceRows.map((workspace) => ({
      workspace,
      role:
        memberRows.find((member) => member.workspace_id === workspace.id)?.role ??
        "member",
    }));
  }),

  setActive: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: members, error: membersError } = await ctx.insforge.database
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", ctx.user.id)
        .eq("workspace_id", input.workspaceId)
        .limit(1);

      if (membersError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: membersError.message,
        });
      }

      if (!members?.[0]) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const { error: updateError } = await ctx.insforge.database
        .from("profiles")
        .update({ active_workspace_id: input.workspaceId })
        .eq("user_id", ctx.user.id);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });
      }

      return { success: true };
    }),

  /**
   * Update workspace name and/or slug — restricted to owner/admin.
   */
  update: workspaceProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80).optional(),
        slug: z
          .string()
          .min(2)
          .max(48)
          .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens")
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin"].includes(ctx.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can update workspace settings",
        });
      }

      if (!input.name && !input.slug) return { success: true };

      // Check slug uniqueness if changing slug
      if (input.slug) {
        const { data: existing } = await ctx.insforge.database
          .from("workspaces")
          .select("id")
          .eq("slug", input.slug)
          .neq("id", ctx.workspace.id)
          .limit(1);

        if (existing && existing.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That slug is already taken",
          });
        }
      }

      const updates: Record<string, string> = {};
      if (input.name) updates.name = input.name;
      if (input.slug) updates.slug = input.slug;

      const { error } = await ctx.insforge.database
        .from("workspaces")
        .update(updates)
        .eq("id", ctx.workspace.id);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return { success: true };
    }),

  /**
   * List all workspace members with their profile display name.
   */
  getMembers: workspaceProcedure.query(async ({ ctx }) => {
    const { data: members, error } = await ctx.insforge.database
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", ctx.workspace.id);

    if (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }

    const memberRows = (members ?? []) as WorkspaceMemberRow[];
    const userIds = memberRows.map((m) => m.user_id);

    // Fetch profiles for display names
    const { data: profiles } = await ctx.insforge.database
      .from("profiles")
      .select("user_id, display_name, avatar_url, email")
      .in("user_id", userIds);

    const profileMap = new Map<string, Pick<ProfileRow, "display_name" | "avatar_url" | "email">>(
      ((profiles ?? []) as ProfileRow[]).map((p) => [p.user_id, p])
    );

    return memberRows.map((m) => ({
      id: m.id,
      userId: m.user_id,
      role: m.role,
      createdAt: m.created_at,
      displayName: profileMap.get(m.user_id)?.display_name ?? null,
      avatarUrl: profileMap.get(m.user_id)?.avatar_url ?? null,
      email: profileMap.get(m.user_id)?.email ?? null,
      isCurrentUser: m.user_id === ctx.user.id,
    }));
  }),

  /**
   * Update a member's role — owner/admin only, cannot change owner's role.
   */
  updateMemberRole: workspaceProcedure
    .input(
      z.object({
        memberId: z.string().uuid(),
        role: z.enum(["admin", "member", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin"].includes(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
      }

      const { data: targets } = await ctx.insforge.database
        .from("workspace_members")
        .select("*")
        .eq("id", input.memberId)
        .eq("workspace_id", ctx.workspace.id)
        .limit(1);

      const target = (targets ?? [])[0] as WorkspaceMemberRow | undefined;
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (target.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "The workspace owner's role cannot be changed",
        });
      }

      const { error } = await ctx.insforge.database
        .from("workspace_members")
        .update({ role: input.role })
        .eq("id", input.memberId)
        .eq("workspace_id", ctx.workspace.id);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return { success: true };
    }),

  /**
   * Remove a member from the workspace — owner/admin only, cannot remove the owner.
   */
  removeMember: workspaceProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin"].includes(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
      }

      const { data: targets } = await ctx.insforge.database
        .from("workspace_members")
        .select("*")
        .eq("id", input.memberId)
        .eq("workspace_id", ctx.workspace.id)
        .limit(1);

      const target = (targets ?? [])[0] as WorkspaceMemberRow | undefined;
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (target.role === "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "The workspace owner cannot be removed" });
      }

      const { error } = await ctx.insforge.database
        .from("workspace_members")
        .delete()
        .eq("id", input.memberId)
        .eq("workspace_id", ctx.workspace.id);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return { success: true };
    }),

  /**
   * Add a member by userId directly — owner/admin only.
   * The invite flow is: share your userId (UUID) or look it up via profile/email in profiles table.
   */
  addMember: workspaceProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "member", "viewer"]).default("member"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin"].includes(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
      }

      // Check if already a member
      const { data: existing } = await ctx.insforge.database
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", ctx.workspace.id)
        .eq("user_id", input.userId)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That user is already a workspace member",
        });
      }

      const { error } = await ctx.insforge.database
        .from("workspace_members")
        .insert([{ workspace_id: ctx.workspace.id, user_id: input.userId, role: input.role }]);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return { success: true };
    }),
});
