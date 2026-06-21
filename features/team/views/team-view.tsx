"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Trash2, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { useTRPC } from "@/trpc/client";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "border-amber-500/40 text-amber-600",
  admin: "border-primary/40 text-primary",
  member: "border-border text-muted-foreground",
  viewer: "border-border text-muted-foreground",
};

type Member = {
  id: string;
  userId: string;
  role: string;
  displayName: string | null;
  email: string | null;
  isCurrentUser: boolean;
};

function MemberRow({ member, canEdit }: { member: Member; canEdit: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateRole = useMutation(
    trpc.workspaces.updateMemberRole.mutationOptions({
      onSuccess: () => {
        toast.success("Role updated");
        queryClient.invalidateQueries(trpc.workspaces.getMembers.queryFilter());
      },
      onError: (e: { message?: string }) => toast.error(e.message ?? "Failed to update role"),
    })
  );

  const remove = useMutation(
    trpc.workspaces.removeMember.mutationOptions({
      onSuccess: () => {
        toast.success("Member removed");
        queryClient.invalidateQueries(trpc.workspaces.getMembers.queryFilter());
      },
      onError: (e: { message?: string }) => toast.error(e.message ?? "Failed to remove member"),
    })
  );

  const label = member.displayName ?? member.email ?? member.userId.slice(0, 8);
  const isOwner = member.role === "owner";
  const isBusy = updateRole.isPending || remove.isPending;

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{label}</p>
          {member.isCurrentUser && <span className="text-[10px] text-muted-foreground">(you)</span>}
        </div>
        {member.email && member.displayName && (
          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canEdit && !isOwner && !member.isCurrentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-md border bg-background hover:bg-muted transition-colors disabled:opacity-50 ${ROLE_COLORS[member.role] ?? ""}`}
              disabled={isBusy}
            >
              {ROLE_LABELS[member.role] ?? member.role}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["admin", "member", "viewer"] as const).map((r) => (
                <DropdownMenuItem key={r} onClick={() => updateRole.mutate({ memberId: member.id, role: r })}>
                  {ROLE_LABELS[r]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Badge variant="outline" className={`h-5 px-1.5 text-[11px] ${ROLE_COLORS[member.role] ?? ""}`}>
            {ROLE_LABELS[member.role] ?? member.role}
          </Badge>
        )}

        {canEdit && !isOwner && !member.isCurrentUser && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => remove.mutate({ memberId: member.id })}
            disabled={isBusy}
          >
            {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );
}

function InviteDialog({ canAdd }: { canAdd: boolean }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [found, setFound] = useState<{ userId: string; displayName: string | null; email: string | null } | null | undefined>(undefined);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const lookup = useQuery({
    ...trpc.workspaces.findByEmail.queryOptions({ email: email || "noop@x.x" }),
    enabled: false,
  });

  const addMember = useMutation(
    trpc.workspaces.addMember.mutationOptions({
      onSuccess: () => {
        toast.success("Member invited");
        queryClient.invalidateQueries(trpc.workspaces.getMembers.queryFilter());
        setOpen(false);
        setEmail("");
        setFound(undefined);
      },
      onError: (e: { message?: string }) => toast.error(e.message ?? "Failed to add member"),
    })
  );

  async function handleLookup() {
    const result = await lookup.refetch();
    setFound(result.data ?? null);
  }

  function handleClose(o: boolean) {
    setOpen(o);
    if (!o) { setEmail(""); setFound(undefined); }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger
        disabled={!canAdd}
        render={<Button size="sm" variant="outline" className="gap-1.5" disabled={!canAdd} />}
      >
        <UserPlus className="h-3.5 w-3.5" />
        Invite member
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Invite a team member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Email address</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="teammate@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value.trim()); setFound(undefined); }}
                disabled={lookup.isFetching || addMember.isPending}
                className="text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleLookup}
                disabled={!email || lookup.isFetching}
              >
                {lookup.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Look up"}
              </Button>
            </div>
          </div>

          {found === null && (
            <p className="text-xs text-destructive">No account found with that email.</p>
          )}

          {found && (
            <div className="rounded-xl border bg-muted/30 p-3 text-sm space-y-0.5">
              <p className="font-medium">{found.displayName ?? found.email}</p>
              {found.displayName && found.email && (
                <p className="text-xs text-muted-foreground">{found.email}</p>
              )}
            </div>
          )}

          {found && (
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Role</p>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as typeof role)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <Button
                className="w-full"
                onClick={() => addMember.mutate({ userId: found.userId, role })}
                disabled={addMember.isPending}
              >
                {addMember.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adding…</> : "Add member"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TeamView() {
  const trpc = useTRPC();
  const { data: currentData } = useQuery(trpc.workspaces.getCurrent.queryOptions());
  const { data: members, isLoading } = useQuery(trpc.workspaces.getMembers.queryOptions());
  const canEdit = ["owner", "admin"].includes(currentData?.role ?? "");

  return (
    <DashboardPageShell
      title="Team"
      description="Manage workspace members and their roles."
      icon={Users}
      breadcrumbs={[{ label: "Team" }]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">
            Members
            {members && <span className="ml-1.5 font-normal text-muted-foreground">({members.length})</span>}
          </h2>
          <InviteDialog canAdd={canEdit} />
        </div>

        <Separator />

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading members…
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(members ?? []).map((m) => (
              <MemberRow key={m.id} member={m} canEdit={canEdit} />
            ))}
          </div>
        )}
      </div>
    </DashboardPageShell>
  );
}
