"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageIcon, FolderOpen, X, Palette, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import type { BrandKitInput } from "@/features/templates/lib/schemas";

export const BRAND_FONTS = [
  "Inter",
  "Outfit",
  "Roboto",
  "Poppins",
  "Montserrat",
  "Open Sans",
  "Lato",
  "Nunito",
  "Source Sans 3",
  "DM Sans",
];

type BrandKitFormValues = BrandKitInput & {
  logoFile?: File | null;
};

type BrandKitFormProps = {
  defaultValues?: Partial<BrandKitFormValues>;
  errors?: Record<string, string>;
  onChange: (values: Partial<BrandKitFormValues>) => void;
  values: BrandKitFormValues;
};

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-8 w-8 shrink-0 cursor-pointer rounded-md border shadow-sm"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 font-mono text-xs uppercase"
          maxLength={7}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function LogoDropzone({
  logoFile,
  existingLogoUrl,
  onChange,
}: {
  logoFile?: File | null;
  existingLogoUrl?: string | null;
  onChange: (file: File | null) => void;
}) {
  const preview = logoFile ? URL.createObjectURL(logoFile) : existingLogoUrl ?? null;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/png": [],
      "image/jpeg": [],
      "image/webp": [],
      "image/svg+xml": [],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
    onDrop: (accepted) => {
      if (accepted.length > 0) onChange(accepted[0]!);
    },
  });

  if (preview) {
    return (
      <div className="flex items-center gap-3 rounded-xl border p-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          <img src={preview} alt="Logo" className="size-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{logoFile?.name ?? "Existing logo"}</p>
          <p className="text-xs text-muted-foreground">PNG, JPEG, WebP or SVG — max 5 MB</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(null)}>
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-8 transition-colors",
        isDragActive ? "border-primary bg-primary/5" : "hover:border-primary/50",
      )}
    >
      <input {...getInputProps()} />
      <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
        <ImageIcon className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium">Upload your logo</p>
        <p className="text-xs text-muted-foreground">PNG, JPEG, WebP or SVG — max 5 MB</p>
      </div>
      <Button type="button" variant="outline" size="sm">
        <FolderOpen className="size-3.5" />
        Choose file
      </Button>
    </div>
  );
}

export function BrandKitForm({
  values,
  errors,
  onChange,
}: BrandKitFormProps) {
  return (
    <div className="space-y-6">
      <Field>
        <FieldLabel htmlFor="bk-name">Brand kit name</FieldLabel>
        <Input
          id="bk-name"
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="My Brand"
          maxLength={120}
        />
        {errors?.name ? <FieldError>{errors.name}</FieldError> : null}
      </Field>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ImageIcon className="size-4 text-muted-foreground" />
          Logo
        </div>
        <LogoDropzone
          logoFile={values.logoFile}
          existingLogoUrl={undefined}
          onChange={(file) => onChange({ logoFile: file })}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Palette className="size-4 text-muted-foreground" />
          Brand colours
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ColorField
            label="Primary"
            value={values.colors.primary}
            onChange={(v) => onChange({ colors: { ...values.colors, primary: v } })}
          />
          <ColorField
            label="Secondary"
            value={values.colors.secondary}
            onChange={(v) => onChange({ colors: { ...values.colors, secondary: v } })}
          />
          <ColorField
            label="Background"
            value={values.colors.background}
            onChange={(v) => onChange({ colors: { ...values.colors, background: v } })}
          />
          <ColorField
            label="Text"
            value={values.colors.text}
            onChange={(v) => onChange({ colors: { ...values.colors, text: v } })}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Type className="size-4 text-muted-foreground" />
          Fonts
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="bk-font-primary">Body font</FieldLabel>
            <select
              id="bk-font-primary"
              value={values.fonts.primary}
              onChange={(e) => onChange({ fonts: { ...values.fonts, primary: e.target.value } })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
            >
              {BRAND_FONTS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="bk-font-header">Header font</FieldLabel>
            <select
              id="bk-font-header"
              value={values.fonts.header}
              onChange={(e) => onChange({ fonts: { ...values.fonts, header: e.target.value } })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
            >
              {BRAND_FONTS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </div>
  );
}
