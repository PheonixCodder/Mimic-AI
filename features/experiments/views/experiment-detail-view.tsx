"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Crown, FlaskConical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { useTRPC } from "@/trpc/client";

const VIDEO_STATUS_CLASS: Record<string, string> = {
  draft:      "bg-muted text-muted-foreground",
  pending:    "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  completed:  "bg-primary/10 text-primary",
  failed:     "bg-destructive/10 text-destructive",
};

const EXP_STATUS_CLASS: Record<string, string> = {
  draft:     "bg-muted text-muted-foreground",
  running:   "bg-blue-50 text-blue-700",
  completed: "bg-primary/10 text-primary",
};

type AddVariantFormProps = {
  experimentId: string;
  onClose: () => void;
};

function AddVariantForm({ experimentId, onClose }: AddVariantFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: voices } = useSuspenseQuery(trpc.voices.getAll.queryOptions({}));
  const { data: avatars } = useSuspenseQuery(trpc.avatars.getAll.queryOptions({}));
  const { data: scripts } = useSuspenseQuery(trpc.scripts.list.queryOptions({}));

  const allVoices = [...voices.custom, ...voices.system];
  const allAvatars = [...avatars.custom, ...avatars.system];

  const [label, setLabel] = useState("");
  const [scriptId, setScriptId] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [avatarId, setAvatarId] = useState("");
  const [resolution, setResolution] = useState("1080p");

  const addMutation = useMutation(
    trpc.experiments.addVariant.mutationOptions({
      onSuccess: () => {
        toast.success("Variant added");
        queryClient.invalidateQueries(trpc.experiments.getById.queryFilter());
        onClose();
      },
      onError: (e: { message?: string }) => toast.error(e.message ?? "Failed to add variant"),
    })
  );

  const canSubmit = label.trim() && scriptId && voiceId && avatarId;

  return (
    <div className="space-y-4 mt-2">
      {[
        { label: "Label", node: <Input placeholder="e.g. Variant A" value={label} onChange={(e) => setLabel(e.target.value)} /> },
      ].map(({ label: l, node }) => (
        <div key={l} className="space-y-1.5"><p className="text-xs font-medium">{l}</p>{node}</div>
      ))}
      <div className="space-y-1.5"><p className="text-xs font-medium">Script</p>
        <Select value={scriptId} onValueChange={(v) => setScriptId(v ?? "")}>
          <SelectTrigger><SelectValue placeholder="Select script" /></SelectTrigger>
          <SelectContent>{scripts.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><p className="text-xs font-medium">Voice</p>
        <Select value={voiceId} onValueChange={(v) => setVoiceId(v ?? "")}>
          <SelectTrigger><SelectValue placeholder="Select voice" /></SelectTrigger>
          <SelectContent>{allVoices.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><p className="text-xs font-medium">Avatar</p>
        <Select value={avatarId} onValueChange={(v) => setAvatarId(v ?? "")}>
          <SelectTrigger><SelectValue placeholder="Select avatar" /></SelectTrigger>
          <SelectContent>{allAvatars.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><p className="text-xs font-medium">Resolution</p>
        <Select value={resolution} onValueChange={(v) => setResolution(v ?? "1080p")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="720p">720p HD</SelectItem>
            <SelectItem value="1080p">1080p Full HD</SelectItem>
            <SelectItem value="4k">4K Ultra HD</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button className="w-full" disabled={!canSubmit || addMutation.isPending}
        onClick={() => addMutation.mutate({ experimentId, label: label.trim(), scriptId, voiceId, avatarId, resolution: resolution as "720p" | "1080p" | "4k" })}>
        {addMutation.isPending ? "Adding…" : "Add variant"}
      </Button>
    </div>
  );
}

export function ExperimentDetailView({ experimentId }: { experimentId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: exp } = useSuspenseQuery(trpc.experiments.getById.queryOptions({ id: experimentId }));
  const [addOpen, setAddOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries(trpc.experiments.getById.queryFilter());

  const statusMutation = useMutation(
    trpc.experiments.updateStatus.mutationOptions({ onSuccess: () => { toast.success("Status updated"); invalidate(); }, onError: (e: { message?: string }) => toast.error(e.message) })
  );
  const winnerMutation = useMutation(
    trpc.experiments.setWinner.mutationOptions({ onSuccess: () => { toast.success("Winner declared!"); invalidate(); }, onError: (e: { message?: string }) => toast.error(e.message) })
  );
  const removeMutation = useMutation(
    trpc.experiments.removeVariant.mutationOptions({
      onSuccess: () => { toast.success("Variant removed"); setRemoveId(null); invalidate(); },
      onError: (e: { message?: string }) => toast.error(e.message),
    })
  );

  const expBadge = EXP_STATUS_CLASS[exp.status] ?? EXP_STATUS_CLASS.draft;

  return (
    <DashboardPageShell
      title={exp.name}
      description={exp.hypothesis ?? "A/B experiment"}
      icon={FlaskConical}
      breadcrumbs={[{ label: "Experiments", href: "/dashboard/experiments" }, { label: exp.name }]}
    >
      <div className="space-y-6 max-w-4xl">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard/experiments" />}>
            <ArrowLeft className="size-3.5" /> Back
          </Button>
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${expBadge}`}>{exp.status}</span>
          <div className="ml-auto flex gap-2">
            {exp.status === "draft" && (
              <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: experimentId, status: "running" })} disabled={statusMutation.isPending}>
                Start running
              </Button>
            )}
          </div>
        </div>

        {/* Variants grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exp.variants.map((variant) => {
            const isWinner = exp.winnerVariantId === variant.id;
            const videoStatus = variant.video?.status ?? "draft";
            const vidBadge = VIDEO_STATUS_CLASS[videoStatus] ?? VIDEO_STATUS_CLASS.draft;
            return (
              <div key={variant.id} className={`rounded-2xl border p-4 space-y-3 relative ${isWinner ? "border-primary bg-primary/5" : ""}`}>
                {isWinner && <Crown className="absolute top-3 right-3 size-4 text-primary" />}
                <div>
                  <p className="text-sm font-semibold">{variant.label}</p>
                  {variant.notes && <p className="text-xs text-muted-foreground mt-0.5">{variant.notes}</p>}
                </div>
                {variant.video ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium truncate">{variant.video.title}</p>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${vidBadge}`}>{videoStatus}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No video</p>
                )}
                <div className="flex gap-2">
                  {variant.videoId && (
                    <Button size="sm" variant="outline" className="flex-1 text-xs" nativeButton={false} render={<Link href={`/dashboard/videos/${variant.videoId}`} />}>
                      View video
                    </Button>
                  )}
                  {exp.status === "running" && !isWinner && (
                    <Button size="sm" variant="default" className="flex-1 text-xs gap-1" onClick={() => winnerMutation.mutate({ experimentId, variantId: variant.id })} disabled={winnerMutation.isPending}>
                      <Crown className="size-3" /> Winner
                    </Button>
                  )}
                  {exp.status !== "completed" && (
                    <Button size="icon-sm" variant="ghost" className="rounded-full text-muted-foreground hover:text-destructive shrink-0" onClick={() => setRemoveId(variant.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add variant card */}
          {exp.status !== "completed" && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger render={<button className="rounded-2xl border border-dashed flex flex-col items-center justify-center gap-2 p-8 text-muted-foreground hover:border-primary hover:text-primary transition-colors h-full min-h-[160px]" />}>
                <Plus className="size-5" />
                <span className="text-xs font-medium">Add variant</span>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle className="text-base">Add variant</DialogTitle></DialogHeader>
                <AddVariantForm experimentId={experimentId} onClose={() => setAddOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <AlertDialog open={!!removeId} onOpenChange={(o) => { if (!o) setRemoveId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove variant?</AlertDialogTitle>
            <AlertDialogDescription>The variant will be removed from the experiment. The video draft will not be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={removeMutation.isPending} onClick={() => removeId && removeMutation.mutate({ variantId: removeId })}>
              {removeMutation.isPending ? "Removing…" : "Remove"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPageShell>
  );
}
