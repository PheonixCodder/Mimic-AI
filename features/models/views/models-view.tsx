"use client";

import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Cpu, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { useTRPC } from "@/trpc/client";

const STATUS_CLASS: Record<string, string> = {
  pending:  "bg-muted text-muted-foreground",
  training: "bg-blue-50 text-blue-700",
  ready:    "bg-primary/10 text-primary",
  failed:   "bg-destructive/10 text-destructive",
};

function formatDate(v: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(v));
}

async function uploadZipToR2(file: File): Promise<string> {
  // 1. Get presigned URL
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "asset", filename: file.name, contentType: file.type, byteSize: file.size }),
  });
  if (!presignRes.ok) throw new Error("Failed to get upload URL");
  const { uploadUrl, r2Key } = await presignRes.json() as { uploadUrl: string; r2Key: string };

  // 2. Upload to R2
  const uploadRes = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!uploadRes.ok) throw new Error("Upload failed");

  return r2Key;
}

function TrainDialog({ canTrain }: { canTrain: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [triggerWord, setTriggerWord] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const trainMutation = useMutation(
    trpc.modelVariants.startTraining.mutationOptions({
      onSuccess: () => {
        toast.success("Training started!");
        queryClient.invalidateQueries(trpc.modelVariants.list.queryFilter());
        setOpen(false); setName(""); setTriggerWord(""); setZipFile(null);
      },
      onError: (e: { message?: string }) => toast.error(e.message ?? "Failed to start training"),
    })
  );

  async function handleSubmit() {
    if (!zipFile) return;
    setUploading(true);
    try {
      const r2Key = await uploadZipToR2(zipFile);
      trainMutation.mutate({ name: name.trim(), triggerWord: triggerWord.trim().toUpperCase(), trainingImagesR2Key: r2Key });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const busy = uploading || trainMutation.isPending;
  const canSubmit = name.trim() && triggerWord.trim().length >= 2 && zipFile;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger disabled={!canTrain} render={<Button size="sm" className="gap-1.5" disabled={!canTrain} />}>
        <Plus className="size-3.5" />
        Train model
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="text-base">Train custom Flux style</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 p-3 text-xs text-amber-800">
            Training takes ~20 minutes and uses compute credits. Requires an active subscription.
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Model name</p>
            <Input placeholder="e.g. My Brand Style" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Trigger word</p>
            <Input placeholder="e.g. MYBRAND" value={triggerWord} onChange={(e) => setTriggerWord(e.target.value.toUpperCase())} disabled={busy} className="font-mono" />
            <p className="text-[11px] text-muted-foreground">Use this word in prompts to invoke your style (2–20 chars, uppercase).</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Training images <span className="text-muted-foreground font-normal">(ZIP, 10–20 images)</span></p>
            <label className={`flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 cursor-pointer transition-colors hover:border-primary ${zipFile ? "border-primary bg-primary/5" : ""}`}>
              <Upload className="size-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {zipFile ? zipFile.name : "Click to select ZIP file"}
              </span>
              <input type="file" accept=".zip,application/zip" className="sr-only" onChange={(e) => setZipFile(e.target.files?.[0] ?? null)} disabled={busy} />
            </label>
          </div>
          <Button className="w-full" disabled={!canSubmit || busy} onClick={handleSubmit}>
            {uploading ? "Uploading…" : trainMutation.isPending ? "Starting training…" : "Start training"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ModelsView() {
  const trpc = useTRPC();
  const { data: workspace } = useSuspenseQuery(trpc.workspaces.getCurrent.queryOptions());
  const { data: models } = useSuspenseQuery(trpc.modelVariants.list.queryOptions());
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);

  const deleteMutation = useMutation(
    trpc.modelVariants.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Model deleted");
        setDeleteId(null);
        queryClient.invalidateQueries(trpc.modelVariants.list.queryFilter());
      },
      onError: (e: { message?: string }) => toast.error(e.message ?? "Failed to delete"),
    })
  );

  return (
    <DashboardPageShell title="Fine-tuning Studio" description="Train custom Flux LoRA adapters from your reference images." icon={Cpu} breadcrumbs={[{ label: "Models" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{models.length} model{models.length !== 1 ? "s" : ""}</p>
          <TrainDialog canTrain={canWrite} />
        </div>

        {models.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 gap-3 text-center">
            <Cpu className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No custom models yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">Train a Flux LoRA adapter on your reference images to generate avatars in your exact visual style.</p>
          </div>
        ) : (
          <div className="rounded-2xl border divide-y">
            {models.map((model) => {
              const badge = STATUS_CLASS[model.status] ?? STATUS_CLASS.pending;
              return (
                <div key={model.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-medium truncate">{model.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badge}`}>{model.status}</span>
                      {model.triggerWord && <span className="text-xs font-mono text-muted-foreground">word: {model.triggerWord}</span>}
                      <span className="text-xs text-muted-foreground">{formatDate(model.createdAt)}</span>
                    </div>
                    {model.status === "failed" && model.errorMessage && (
                      <p className="text-xs text-destructive">{model.errorMessage}</p>
                    )}
                  </div>
                  {canWrite && (
                    <Button variant="ghost" size="icon-sm" className="shrink-0 rounded-full text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(model.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete model?</AlertDialogTitle>
            <AlertDialogDescription>The trained model weights will be removed. This cannot be undone.</AlertDialogDescription>
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
