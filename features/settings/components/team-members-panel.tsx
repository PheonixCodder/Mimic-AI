"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Trash2, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "border-amber-500/40 text-amber-600",
  admin: "border-emerald-600/40 text-emerald-600",
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

function MemberRow({
  member,
  canEdit,
}: {
  member: Member;
  canEdit: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateRole = useMutation(
    trpc.workspaces.updateMemberRole.mutationOptions({
      onSuccess: () => {
        toast.success("Role updated");
        queryClient.invalidateQueries(trpc.workspaces.getMembers.queryFilter());
      },
      onError: (err: { message?: string }) =>
        toast.error(err.message ?? "Failed to update role"),
    })
  );

  const remove = useMutation(
    trpc.workspaces.removeMember.mutationOptions({
      onSuccess: () => {
        toast.success("Member removed");
        queryClient.invalidateQueries(trpc.workspaces.getMembers.queryFilter());
      },
      onError: (err: { message?: string }) =>
        toast.error(err.message ?? "Failed to remove member"),
    })
  );

  const displayLabel =
    member.displayName ?? member.email ?? member.userId.slice(0, 8);
  const isOwner = member.role === "owner";
  const isBusy = updateRole.isPending || remove.isPending;

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {displayLabel}
          </p>
          {member.isCurrentUser && (
            <span className="text-[10px] text-muted-foreground">(you)</span>
          )}
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
              id={`role-select-${member.id}`}
            >
              {ROLE_LABELS[member.role] ?? member.role}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["admin", "member", "viewer"] as const).map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() =>
                    updateRole.mutate({ memberId: member.id, role: r })
                  }
                  className="text-sm"
                >
                  {ROLE_LABELS[r]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Badge
            variant="outline"
            className={`h-5 px-1.5 text-[11px] ${ROLE_COLORS[member.role] ?? ""}`}
          >
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
            id={`remove-member-${member.id}`}
          >
            {remove.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function AddMemberDialog({ canAdd }: { canAdd: boolean }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const addMember = useMutation(
    trpc.workspaces.addMember.mutationOptions({
      onSuccess: () => {
        toast.success("Member added");
        queryClient.invalidateQueries(trpc.workspaces.getMembers.queryFilter());
        setOpen(false);
        setUserId("");
        setRole("member");
      },
      onError: (err: { message?: string }) =>
        toast.error(err.message ?? "Failed to add member"),
    })
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={!canAdd}
        render={
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!canAdd}
            id="add-member-btn"
          />
        }
      >
        <UserPlus className="h-3.5 w-3.5" />
        Invite member
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Add a team member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-userid" className="text-xs font-medium">
              User ID
            </Label>
            <Input
              id="invite-userid"
              type="text"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={userId}
              onChange={(e) => setUserId(e.target.value.trim())}
              disabled={addMember.isPending}
              className="text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Ask the user to share their account ID from their profile settings.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-role" className="text-xs font-medium">
              Role
            </Label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "admin" | "member" | "viewer")
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <Button
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => addMember.mutate({ userId, role })}
            disabled={!userId.trim() || addMember.isPending}
            id="invite-submit-btn"
          >
            {addMember.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Adding…
              </>
            ) : (
              "Add member"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TeamMembersPanel() {
  const trpc = useTRPC();
  const { data: currentData } = useQuery(
    trpc.workspaces.getCurrent.queryOptions()
  );
  const { data: members, isLoading } = useQuery(
    trpc.workspaces.getMembers.queryOptions()
  );

  const canEdit = ["owner", "admin"].includes(currentData?.role ?? "");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            Team Members
          </h2>
          {members && (
            <span className="text-xs text-muted-foreground">
              ({members.length})
            </span>
          )}
        </div>
        <AddMemberDialog canAdd={canEdit} />
      </div>
      <Separator />

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading members…
        </div>
      ) : (
        <div className="divide-y divide-border max-w-lg">
          {(members ?? []).map((m) => (
            <MemberRow key={m.id} member={m} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
