import "server-only";

import { insforgeAdmin } from "@/lib/insforge/admin";

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

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base || "workspace"}-${suffix}`;
}

async function setActiveWorkspaceIfMissing(userId: string, workspaceId: string) {
  const { data: profiles } = await insforgeAdmin.database
    .from("profiles")
    .select("active_workspace_id")
    .eq("user_id", userId)
    .limit(1);

  const profile = profiles?.[0] as { active_workspace_id: string | null } | undefined;

  if (profile && !profile.active_workspace_id) {
    await insforgeAdmin.database
      .from("profiles")
      .update({ active_workspace_id: workspaceId })
      .eq("user_id", userId);
  }
}

export async function ensurePersonalWorkspace(user: {
  id: string;
  email?: string | null;
  profile?: { name?: string | null } | null;
}) {
  const { data: members, error: membersError } = await insforgeAdmin.database
    .from("workspace_members")
    .select("*")
    .eq("user_id", user.id)
    .limit(1);

  if (membersError) {
    throw new Error(membersError.message ?? "Failed to load workspace membership");
  }

  const existingMember = members?.[0] as WorkspaceMemberRow | undefined;

  if (existingMember) {
    const { data: workspaces, error: workspaceError } = await insforgeAdmin.database
      .from("workspaces")
      .select("*")
      .eq("id", existingMember.workspace_id)
      .limit(1);

    if (workspaceError || !workspaces?.[0]) {
      throw new Error(workspaceError?.message ?? "Failed to load workspace");
    }

    const workspace = workspaces[0] as WorkspaceRow;
    await setActiveWorkspaceIfMissing(user.id, workspace.id);

    return {
      workspace,
      role: existingMember.role,
    };
  }

  const displayName =
    user.profile?.name?.trim() ||
    user.email?.split("@")[0] ||
    "Personal";

  const slug = slugify(user.email?.split("@")[0] ?? user.id);

  const { data: createdWorkspaces, error: workspaceError } = await insforgeAdmin.database
    .from("workspaces")
    .insert([
      {
        name: "Personal",
        slug,
        owner_id: user.id,
      },
    ])
    .select();

  if (workspaceError || !createdWorkspaces?.[0]) {
    throw new Error(workspaceError?.message ?? "Failed to create workspace");
  }

  const workspace = createdWorkspaces[0] as WorkspaceRow;

  await insforgeAdmin.database
    .from("workspaces")
    .update({ polar_external_id: workspace.id })
    .eq("id", workspace.id);

  const { error: memberError } = await insforgeAdmin.database
    .from("workspace_members")
    .insert([
      {
        workspace_id: workspace.id,
        user_id: user.id,
        role: "owner",
      },
    ]);

  if (memberError) {
    throw new Error(memberError.message ?? "Failed to create workspace membership");
  }

  await insforgeAdmin.database
    .from("profiles")
    .update({
      display_name: displayName,
      active_workspace_id: workspace.id,
    })
    .eq("user_id", user.id);

  return {
    workspace: { ...workspace, polar_external_id: workspace.id },
    role: "owner" as const,
  };
}
