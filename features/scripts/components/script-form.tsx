"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCharacterCount } from "@/features/scripts/lib/character-count";
import type { Project } from "@/trpc/routers/projects";
import type { Script } from "@/trpc/routers/scripts";
import { useTRPC } from "@/trpc/client";

type ScriptFormProps = {
  mode: "create" | "edit";
  script?: Script;
  projects: Project[];
  canWrite: boolean;
  onSuccess: (script: Script) => void;
  formId?: string;
  hideSubmit?: boolean;
};

export function ScriptForm({
  mode,
  script,
  projects,
  canWrite,
  onSuccess,
  formId = "script-form",
  hideSubmit = false,
}: ScriptFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const isEditing = mode === "edit";

  const [title, setTitle] = useState(script?.title ?? "");
  const [content, setContent] = useState(script?.content ?? "");
  const [projectId, setProjectId] = useState<string | null>(
    script?.projectId ?? null,
  );
  const [isPending, setIsPending] = useState(false);

  const createMutation = useMutation(trpc.scripts.create.mutationOptions());
  const updateMutation = useMutation(trpc.scripts.update.mutationOptions());

  const characterCount = getCharacterCount(content);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canWrite) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      toast.error("Enter a title");
      return;
    }

    if (!trimmedContent) {
      toast.error("Enter script content");
      return;
    }

    setIsPending(true);

    try {
      const values = {
        title: trimmedTitle,
        content: trimmedContent,
        projectId,
      };

      let saved: Script;

      if (isEditing && script) {
        saved = await updateMutation.mutateAsync({
          id: script.id,
          ...values,
        });
      } else {
        saved = await createMutation.mutateAsync(values);
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.scripts.list.queryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: trpc.scripts.getById.queryKey({ id: saved.id }),
        }),
      ]);

      onSuccess(saved);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save script",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${formId}-title`}>Title</FieldLabel>
          <Input
            id={`${formId}-title`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Product launch explainer"
            maxLength={120}
            disabled={!canWrite}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={`${formId}-project`}>Project (optional)</FieldLabel>
          <Select
            value={projectId ?? "none"}
            onValueChange={(value) => {
              setProjectId(value === "none" ? null : value);
            }}
            disabled={!canWrite}
          >
            <SelectTrigger id={`${formId}-project`} className="w-full">
              <SelectValue placeholder="Select project..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor={`${formId}-content`}>Script</FieldLabel>
          <Textarea
            id={`${formId}-content`}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Enter your script here..."
            rows={12}
            maxLength={50000}
            disabled={!canWrite}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {characterCount.toLocaleString()} characters
          </p>
        </Field>
      </FieldGroup>

      {canWrite && !hideSubmit ? (
        <div className="mt-6">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : isEditing
                ? "Save changes"
                : "Create script"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export function ScriptFormSubmitButton({
  formId = "script-form",
  mode,
  isPending = false,
}: {
  formId?: string;
  mode: "create" | "edit";
  isPending?: boolean;
}) {
  return (
    <Button type="submit" form={formId} disabled={isPending}>
      {isPending
        ? "Saving..."
        : mode === "edit"
          ? "Save changes"
          : "Create script"}
    </Button>
  );
}
