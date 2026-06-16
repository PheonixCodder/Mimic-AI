"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import type { TemplateInput } from "@/features/templates/lib/schemas";
import type { BrandKit } from "@/trpc/routers/brand-kits";
import type { Voice } from "@/trpc/routers/voices";
import type { Avatar } from "@/trpc/routers/avatars";

const ASPECT_RATIOS = [
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "1:1", label: "Square (1:1)" },
] as const;

const AVATAR_POSITIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

const AVATAR_SIZES = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
] as const;

type TemplateFormValues = TemplateInput;

type TemplateFormProps = {
  values: TemplateFormValues;
  errors?: Record<string, string>;
  onChange: (partial: Partial<TemplateFormValues>) => void;
  brandKits: BrandKit[];
  voices: Voice[];
  avatars: Avatar[];
};

export function TemplateForm({
  values,
  errors,
  onChange,
  brandKits,
  voices,
  avatars,
}: TemplateFormProps) {
  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="tpl-name">Template name</FieldLabel>
        <Input
          id="tpl-name"
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Product launch — landscape"
          maxLength={120}
        />
        {errors?.name ? <FieldError>{errors.name}</FieldError> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor="tpl-desc">Description (optional)</FieldLabel>
        <Textarea
          id="tpl-desc"
          value={values.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value || null })}
          placeholder="Briefly describe when to use this template…"
          rows={2}
          maxLength={500}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="tpl-brand-kit">Brand kit (optional)</FieldLabel>
        <Select
          value={values.brandKitId ?? "none"}
          onValueChange={(v) => onChange({ brandKitId: v === "none" ? null : v })}
        >
          <SelectTrigger id="tpl-brand-kit" className="w-full">
            <SelectValue placeholder="Select brand kit…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No brand kit</SelectItem>
            {brandKits.map((kit) => (
              <SelectItem key={kit.id} value={kit.id}>
                {kit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="tpl-voice">Default voice (optional)</FieldLabel>
          <Select
            value={values.voiceId ?? "none"}
            onValueChange={(v) => onChange({ voiceId: v === "none" ? null : v })}
          >
            <SelectTrigger id="tpl-voice" className="w-full">
              <SelectValue placeholder="Select voice…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No default</SelectItem>
              {voices.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="tpl-avatar">Default avatar (optional)</FieldLabel>
          <Select
            value={values.avatarId ?? "none"}
            onValueChange={(v) => onChange({ avatarId: v === "none" ? null : v })}
          >
            <SelectTrigger id="tpl-avatar" className="w-full">
              <SelectValue placeholder="Select avatar…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No default</SelectItem>
              {avatars.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <p className="text-sm font-medium">Layout settings</p>

        <div className="grid grid-cols-3 gap-3">
          <Field>
            <FieldLabel htmlFor="tpl-aspect">Aspect ratio</FieldLabel>
            <Select
              value={values.layoutConfig.aspectRatio}
              onValueChange={(v) =>
                onChange({ layoutConfig: { ...values.layoutConfig, aspectRatio: v as "16:9" | "9:16" | "1:1" } })
              }
            >
              <SelectTrigger id="tpl-aspect" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="tpl-pos">Avatar position</FieldLabel>
            <Select
              value={values.layoutConfig.avatarPosition}
              onValueChange={(v) =>
                onChange({ layoutConfig: { ...values.layoutConfig, avatarPosition: v as "left" | "center" | "right" } })
              }
            >
              <SelectTrigger id="tpl-pos" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVATAR_POSITIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="tpl-size">Avatar size</FieldLabel>
            <Select
              value={values.layoutConfig.avatarSize}
              onValueChange={(v) =>
                onChange({ layoutConfig: { ...values.layoutConfig, avatarSize: v as "small" | "medium" | "large" } })
              }
            >
              <SelectTrigger id="tpl-size" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVATAR_SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.layoutConfig.subtitlesEnabled}
            onChange={(e) =>
              onChange({
                layoutConfig: { ...values.layoutConfig, subtitlesEnabled: e.target.checked },
              })
            }
            className="size-4 rounded border-input"
          />
          Enable subtitles by default
        </label>
      </div>
    </div>
  );
}
