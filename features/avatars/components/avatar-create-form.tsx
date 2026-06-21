"use client";

import { useMemo } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  AlignLeft,
  FolderOpen,
  ImageIcon,
  Layers,
  UserRound,
  X,
} from "lucide-react";

import { cn, formatFileSize } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AVATAR_STYLES,
  AVATAR_STYLE_LABELS,
} from "@/features/avatars/data/avatar-styles";

const avatarCreateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  file: z
    .instanceof(File, { message: "An image file is required" })
    .nullable()
    .refine((file) => file !== null, "An image file is required"),
  style: z.string().min(1, "A style is required"),
  description: z.string(),
  removeBackground: z.boolean(),
  modelVariantId: z.string().nullable(),
});

function ImageDropzone({
  file,
  onFileChange,
  isInvalid,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  isInvalid?: boolean;
}) {
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      accept: {
        "image/png": [],
        "image/jpeg": [],
        "image/webp": [],
      },
      maxSize: 10 * 1024 * 1024,
      multiple: false,
      onDrop: (acceptedFiles) => {
        if (acceptedFiles.length > 0) {
          onFileChange(acceptedFiles[0]);
        }
      },
    });

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border p-4">
        <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageIcon className="size-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onFileChange(null)}
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border px-6 py-10 transition-colors",
        isDragReject || isInvalid
          ? "border-destructive"
          : isDragActive
            ? "border-primary"
            : "",
      )}
    >
      <input {...getInputProps()} />
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <ImageIcon className="size-5 text-muted-foreground" />
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <p className="text-base font-semibold tracking-tight">
          Upload your portrait
        </p>
        <p className="text-center text-sm text-muted-foreground">
          PNG, JPEG, or WebP — min 256×256, max 10MB
        </p>
      </div>

      <Button type="button" variant="outline" size="sm">
        <FolderOpen className="size-3.5" />
        Upload image
      </Button>
    </div>
  );
}

type AvatarCreateFormProps = {
  scrollable?: boolean;
  footer?: (submit: React.ReactNode) => React.ReactNode;
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

export function AvatarCreateForm({
  scrollable,
  footer,
  onSuccess,
  onError,
}: AvatarCreateFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: readyModels = [] } = useSuspenseQuery(trpc.modelVariants.getReady.queryOptions());

  const createMutation = useMutation({
    mutationFn: async ({
      name,
      file,
      style,
      description,
      removeBackground,
      modelVariantId,
    }: {
      name: string;
      file: File;
      style: string;
      description?: string;
      removeBackground?: boolean;
      modelVariantId?: string | null;
    }) => {
      const params = new URLSearchParams({ name, style });
      if (description) params.set("description", description);
      if (removeBackground) params.set("removeBackground", "true");
      if (modelVariantId) params.set("modelVariantId", modelVariantId);

      const response = await fetch(`/api/avatars/create?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        const body = (await response.json()) as {
          message?: string;
          error?: string;
        };
        throw new Error(body.message ?? body.error ?? "Failed to create avatar");
      }

      return response.json();
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      file: null as File | null,
      style: "PROFESSIONAL" as string,
      description: "",
      removeBackground: false,
      modelVariantId: null as string | null,
    },
    validators: {
      onSubmit: avatarCreateFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createMutation.mutateAsync({
          name: value.name,
          file: value.file!,
          style: value.style,
          description: value.description || undefined,
          removeBackground: value.removeBackground,
          modelVariantId: value.modelVariantId ?? null,
        });

        toast.success("Avatar created successfully!");
        await queryClient.invalidateQueries({
          queryKey: trpc.avatars.getAll.queryKey(),
        });
        form.reset();
        onSuccess?.();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create avatar";

        if (onError) {
          onError(message);
        } else {
          toast.error(message);
        }
      }
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className={cn("flex flex-col", scrollable ? "min-h-0 flex-1" : "gap-6")}
    >
      <div
        className={cn(
          scrollable
            ? "no-scrollbar flex flex-col gap-6 overflow-y-auto px-4"
            : "flex flex-col gap-6",
        )}
      >
        <form.Field name="file">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <ImageDropzone
                  file={field.state.value}
                  onFileChange={field.handleChange}
                  isInvalid={isInvalid}
                />
                {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <div className="relative flex items-center">
                  <div className="pointer-events-none absolute left-0 flex h-full w-11 items-center justify-center">
                    <UserRound className="size-4 text-muted-foreground" />
                  </div>
                  <Input
                    id={field.name}
                    placeholder="Avatar label"
                    aria-invalid={isInvalid}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    className="pl-10"
                  />
                </div>
                {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="style">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <div className="relative flex items-center">
                  <div className="pointer-events-none absolute left-0 z-10 flex h-full w-11 items-center justify-center">
                    <Layers className="size-4 text-muted-foreground" />
                  </div>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (value) {
                        field.handleChange(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full pl-10">
                      <SelectValue placeholder="Select style..." />
                    </SelectTrigger>
                    <SelectContent>
                      {AVATAR_STYLES.map((style) => (
                        <SelectItem key={style} value={style}>
                          {AVATAR_STYLE_LABELS[style]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="modelVariantId">
          {(field) => (
            <Field>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-0 z-10 flex h-full w-11 items-center justify-center">
                  <UserRound className="size-4 text-muted-foreground" />
                </div>
                <Select
                  value={field.state.value ?? ""}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger className="w-full pl-10">
                    <SelectValue placeholder="Custom style (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Default Flux model</SelectItem>
                    {readyModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} ({model.trigger_word})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Field>
          )}
        </form.Field>

        <form.Field name="modelVariantId">
          {(field) => (
            <Field>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-0 z-10 flex h-full w-11 items-center justify-center">
                  <UserRound className="size-4 text-muted-foreground" />
                </div>
                <Select
                  value={field.state.value ?? ""}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger className="w-full pl-10">
                    <SelectValue placeholder="Custom style (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Default Flux model</SelectItem>
                    {readyModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} ({model.trigger_word})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Field>
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <div className="relative flex items-center">
                  <div className="pointer-events-none absolute top-0 left-0 flex h-11 w-11 items-center justify-center">
                    <AlignLeft className="size-4 text-muted-foreground" />
                  </div>
                  <Textarea
                    id={field.name}
                    placeholder="Describe this avatar..."
                    aria-invalid={isInvalid}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    className="min-h-20 pl-10"
                    rows={3}
                  />
                </div>
                {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="removeBackground">
          {(field) => {
            return (
              <Field className="flex items-center gap-2 py-1 select-none">
                <input
                  id={field.name}
                  type="checkbox"
                  checked={field.state.value}
                  onChange={(event) => field.handleChange(event.target.checked)}
                  onBlur={field.handleBlur}
                  className="size-4 rounded border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                />
                <label
                  htmlFor={field.name}
                  className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                >
                  Remove background using Cloudinary AI
                </label>
              </Field>
            );
          }}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ isSubmitting }) => {
            const submitButton = (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create avatar"}
              </Button>
            );

            return footer ? footer(submitButton) : submitButton;
          }}
        </form.Subscribe>
      </div>
    </form>
  );
}
