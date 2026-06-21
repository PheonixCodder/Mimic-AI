"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FlaskConical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { useTRPC } from "@/trpc/client";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-muted text-muted-foreground" },
  running:   { label: "Running",   className: "bg-blue-50 text-blue-700" },
  completed: { label: "Completed", className: "bg-primary/10 text-primary" },
};

function formatDate(v: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(v));
}

function CreateDialog({ canCreate }: { canCreate: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const createMutation = useMutation(
    trpc.experiments.create.mutationOptions({
      onSuccess: (exp) => {
        toast.success("Experiment created");
        queryClient.invalidateQueries(trpc.experiments.list.queryFilter());
        setOpen(false); setName(""); setHypothesis("");
        // Navigate to detail page
      },
      onError: (e: { message?: string }) => toast.error(e.message ?? "Failed to create"),
    })
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger disabled={!canCreate} render={<Button size="sm" className="gap-1.5" disabled={!canCreate} />}>
        <Plus className="size-3.5" />
        New experiment
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="text-base">New experiment</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Name</p>
            <Input placeholder="e.g. Voice A vs Voice B" value={name} onChange={(e) => setName(e.target.value)} disabled={createMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Hypothesis <span className="text-muted-foreground font-normal">(optional)</span></p>
            <Textarea placeholder="What are you trying to find out?" value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} rows={3} disabled={createMutation.isPending} className="resize-none" />
          </div>
          <Button className="w-full" onClick={() => createMutation.mutate({ name: name.trim(), hypothesis: hypothesis.trim() || undefined })} disabled={!name.trim() || createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create experiment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ExperimentsView() {
  const trpc = useTRPC();
  const { data: workspace } = useSuspenseQuery(trpc.workspaces.getCurrent.queryOptions());
  const { data: experiments } = useSuspenseQuery(trpc.experiments.list.queryOptions());
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);

  const deleteMutation = useMutation(
    trpc.experiments.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Experiment deleted");
        setDeleteId(null);
        queryClient.invalidateQueries(trpc.experiments.list.queryFilter());
      },
      onError: (e: { message?: string }) => toast.error(e.message ?? "Failed to delete"),
    })
  );

  return (
    <DashboardPageShell title="Experiments" description="A/B test different video configurations to find what works best." icon={FlaskConical} breadcrumbs={[{ label: "Experiments" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{experiments.length} experiment{experiments.length !== 1 ? "s" : ""}</p>
          <CreateDialog canCreate={canWrite} />
        </div>

        {experiments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 gap-3 text-center">
            <FlaskConical className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No experiments yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">Create an experiment to compare different voices, avatars, or scripts side by side.</p>
          </div>
        ) : (
          <div className="rounded-2xl border divide-y">
            {experiments.map((exp) => {
              const badge = STATUS_BADGE[exp.status] ?? STATUS_BADGE.draft;
              return (
                <div key={exp.id} className="flex items-center gap-4 px-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/experiments/${exp.id}`} className="text-sm font-medium hover:text-primary truncate">
                        {exp.name}
                      </Link>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
                    </div>
                    {exp.hypothesis && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{exp.hypothesis}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{exp.variantCount} variant{exp.variantCount !== 1 ? "s" : ""} · {formatDate(exp.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" render={<Link href={`/dashboard/experiments/${exp.id}`} />}>
                      View
                    </Button>
                    {canWrite && (
                      <Button variant="ghost" size="icon-sm" className="rounded-full text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(exp.id)} aria-label="Delete">
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete experiment?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the experiment and all its variants. The associated video drafts will not be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPageShell>
  );
}
