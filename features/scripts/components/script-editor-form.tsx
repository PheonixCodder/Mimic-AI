"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Clapperboard, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScriptForm } from "@/features/scripts/components/script-form";
import type { Script } from "@/trpc/routers/scripts";
import { useTRPC } from "@/trpc/client";

type ScriptEditorFormProps = {
  mode: "create" | "edit";
  script?: Script & { projectName?: string | null };
};

export function ScriptEditorForm({ mode, script }: ScriptEditorFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: projects } = useSuspenseQuery(trpc.projects.list.queryOptions());
  const { data: workspace } = useSuspenseQuery(
    trpc.workspaces.getCurrent.queryOptions(),
  );

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);
  const isEditing = mode === "edit";
  const formId = isEditing ? "script-edit-page-form" : "script-create-page-form";

  function handleSuccess(saved: Script) {
    if (isEditing) {
      toast.success("Script saved");
      return;
    }

    toast.success("Script created");
    router.push(`/dashboard/scripts/${saved.id}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit script" : "Create script"}</CardTitle>
          <CardDescription>
            Write the narration your avatar will deliver in production.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScriptForm
            mode={mode}
            script={script}
            projects={projects}
            canWrite={canWrite}
            formId={formId}
            onSuccess={handleSuccess}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<Link href="/dashboard/scripts" />}
            >
              {canWrite ? "Cancel" : "Back to scripts"}
            </Button>

            {isEditing && script ? (
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                render={
                  <Link
                    href={`/dashboard/videos/new?scriptId=${encodeURIComponent(script.id)}`}
                  />
                }
              >
                <Clapperboard />
                Use in video
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            AI assist
          </CardTitle>
          <CardDescription>
            Available after OpenRouter setup in a later phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Planned capabilities:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Hook and CTA suggestions</li>
            <li>Tone and clarity improvements</li>
            <li>Translations for multilingual productions</li>
          </ul>
          <Button variant="outline" size="sm" disabled className="w-full">
            Generate suggestions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
