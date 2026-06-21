"use client";

import { useState } from "react";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { useTRPC } from "@/trpc/client";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function CreateKeyDialog({ canCreate }: { canCreate: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rawKey, setRawKey] = useState<string | null>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    trpc.apiKeys.create.mutationOptions({
      onSuccess: (data) => {
        setRawKey(data.rawKey);
        queryClient.invalidateQueries(trpc.apiKeys.list.queryFilter());
      },
      onError: (e: { message?: string }) => toast.error(e.message ?? "Failed to create key"),
    })
  );

  function handleClose(o: boolean) {
    setOpen(o);
    if (!o) { setName(""); setRawKey(null); }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger disabled={!canCreate} render={<Button size="sm" className="gap-1.5" disabled={!canCreate} />}>
        <Plus className="size-3.5" />
        New API key
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{rawKey ? "Save your API key" : "Create API key"}</DialogTitle>
        </DialogHeader>

        {rawKey ? (
          <div className="space-y-4 mt-2">
            <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 p-3 text-xs text-amber-800">
              Copy this key now — it will never be shown again.
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-xl border bg-muted px-3 py-2 text-xs font-mono break-all">
                {rawKey}
              </code>
              <Button
                size="icon-sm"
                variant="outline"
                className="shrink-0 rounded-full"
                onClick={() => { navigator.clipboard.writeText(rawKey); toast.success("Copied!"); }}
                aria-label="Copy API key"
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
            <Button className="w-full" onClick={() => handleClose(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Key name</p>
              <Input
                placeholder="e.g. Production, CI/CD"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => createMutation.mutate({ name: name.trim() })}
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create key"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ApiKeysView() {
  const trpc = useTRPC();
  const { data: workspace } = useSuspenseQuery(trpc.workspaces.getCurrent.queryOptions());
  const { data: keys } = useSuspenseQuery(trpc.apiKeys.list.queryOptions());
  const queryClient = useQueryClient();
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const canManage = ["owner", "admin"].includes(workspace.role);

  const revokeMutation = useMutation(
    trpc.apiKeys.revoke.mutationOptions({
      onSuccess: () => {
        toast.success("API key revoked");
        setRevokeId(null);
        queryClient.invalidateQueries(trpc.apiKeys.list.queryFilter());
      },
      onError: (e: { message?: string }) => toast.error(e.message ?? "Failed to revoke key"),
    })
  );

  return (
    <DashboardPageShell
      title="API Keys"
      description="Manage API keys for programmatic access to your workspace."
      icon={KeyRound}
      breadcrumbs={[{ label: "API" }]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{keys.length} key{keys.length !== 1 ? "s" : ""}</p>
          <CreateKeyDialog canCreate={canManage} />
        </div>

        {keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 gap-3 text-center">
            <KeyRound className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No API keys</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Create an API key to authenticate programmatic requests to your workspace.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border divide-y">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium truncate">{key.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {key.keyPrefix}…
                    <span className="ml-2 font-sans">
                      · {key.lastUsedAt ? `Last used ${formatDate(key.lastUsedAt)}` : "Never used"}
                      {" · "}Created {formatDate(key.createdAt)}
                    </span>
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                    onClick={() => setRevokeId(key.id)}
                    aria-label="Revoke key"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!revokeId} onOpenChange={(o) => { if (!o) setRevokeId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              Any integrations using this key will stop working immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={revokeMutation.isPending}
              onClick={() => revokeId && revokeMutation.mutate({ id: revokeId })}
            >
              {revokeMutation.isPending ? "Revoking…" : "Revoke"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPageShell>
  );
}
