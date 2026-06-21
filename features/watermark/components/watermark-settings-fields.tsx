"use client";

import { ShieldAlert, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SYSTEM_WATERMARK_DEFAULTS,
  type WatermarkFieldsInput,
  type WatermarkPosition,
  type WatermarkSize,
  type WatermarkType,
} from "@/lib/watermark";

export type WatermarkSettingsValue = Required<
  Pick<
    WatermarkFieldsInput,
    | "watermarkEnabled"
    | "watermarkText"
    | "watermarkType"
    | "watermarkPosition"
    | "watermarkOpacity"
    | "watermarkSize"
  >
>;

type WatermarkSettingsFieldsProps = {
  value: WatermarkSettingsValue;
  onChange: (value: Partial<WatermarkSettingsValue>) => void;
  isPremium: boolean;
  disabled?: boolean;
  onUpgradeCheckout?: () => void;
  isCheckoutPending?: boolean;
};

const POSITION_LABELS: Record<WatermarkPosition, string> = {
  "top-left": "Top left",
  "top-right": "Top right",
  "bottom-left": "Bottom left",
  "bottom-right": "Bottom right",
};

const SIZE_LABELS: Record<WatermarkSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

export function createDefaultWatermarkSettings(): WatermarkSettingsValue {
  return {
    watermarkEnabled: SYSTEM_WATERMARK_DEFAULTS.watermarkEnabled,
    watermarkText: SYSTEM_WATERMARK_DEFAULTS.watermarkText,
    watermarkType: SYSTEM_WATERMARK_DEFAULTS.watermarkType,
    watermarkPosition: SYSTEM_WATERMARK_DEFAULTS.watermarkPosition,
    watermarkOpacity: SYSTEM_WATERMARK_DEFAULTS.watermarkOpacity,
    watermarkSize: SYSTEM_WATERMARK_DEFAULTS.watermarkSize,
  };
}

export function WatermarkSettingsFields({
  value,
  onChange,
  isPremium,
  disabled = false,
  onUpgradeCheckout,
  isCheckoutPending = false,
}: WatermarkSettingsFieldsProps) {
  const controlsDisabled = disabled || !isPremium;

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Watermark</p>
        <p className="text-xs text-muted-foreground">
          {isPremium
            ? "Customize or disable the watermark on exported media."
            : "Free workspaces always include the Mimic AI watermark."}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium select-none">
        <input
          type="checkbox"
          checked={value.watermarkEnabled}
          disabled={controlsDisabled}
          onChange={(e) => onChange({ watermarkEnabled: e.target.checked })}
          className="size-4 rounded border-input text-primary focus:ring-primary disabled:opacity-50"
        />
        Include watermark
      </label>

      {!isPremium ? (
        <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
          <div className="flex gap-2">
            <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-2">
              <p className="font-semibold">Premium required for customization</p>
              <p>
                Free plans always render the default{" "}
                <span className="font-medium">{SYSTEM_WATERMARK_DEFAULTS.watermarkText}</span>{" "}
                watermark. Upgrade to customize text, logo, position, opacity, and size.
              </p>
              <div className="flex flex-wrap gap-2">
                {onUpgradeCheckout ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={onUpgradeCheckout}
                    disabled={isCheckoutPending}
                    className="gap-1 border-amber-300 text-amber-900 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/40"
                  >
                    <Sparkles className="size-3 text-amber-600 dark:text-amber-400" />
                    {isCheckoutPending ? "Opening checkout..." : "Upgrade workspace"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-green-200/50 bg-green-50/50 p-3 text-xs text-green-800 dark:border-green-900/30 dark:bg-green-950/20 dark:text-green-400">
          <p className="font-semibold flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-green-600 dark:text-green-400" />
            Premium active — watermark customization unlocked.
          </p>
        </div>
      )}

      {value.watermarkEnabled ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="wm-type">Watermark type</FieldLabel>
            <Select
              value={value.watermarkType}
              onValueChange={(val) =>
                onChange({ watermarkType: val as WatermarkType })
              }
              disabled={controlsDisabled}
            >
              <SelectTrigger id="wm-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="logo">Brand logo</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {value.watermarkType === "text" ? (
            <Field>
              <FieldLabel htmlFor="wm-text">Watermark text</FieldLabel>
              <Input
                id="wm-text"
                value={value.watermarkText}
                onChange={(e) => onChange({ watermarkText: e.target.value })}
                disabled={controlsDisabled}
                maxLength={120}
              />
            </Field>
          ) : (
            <Field>
              <FieldLabel>Logo source</FieldLabel>
              <p className="text-xs text-muted-foreground">
                Uses the logo from your most recent brand kit.
              </p>
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="wm-position">Position</FieldLabel>
            <Select
              value={value.watermarkPosition}
              onValueChange={(val) =>
                onChange({ watermarkPosition: val as WatermarkPosition })
              }
              disabled={controlsDisabled}
            >
              <SelectTrigger id="wm-position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(POSITION_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="wm-size">Size</FieldLabel>
            <Select
              value={value.watermarkSize}
              onValueChange={(val) =>
                onChange({ watermarkSize: val as WatermarkSize })
              }
              disabled={controlsDisabled}
            >
              <SelectTrigger id="wm-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SIZE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <FieldLabel htmlFor="wm-opacity" className="mb-0">
                Opacity
              </FieldLabel>
              <span className="text-xs text-muted-foreground">
                {Math.round(value.watermarkOpacity * 100)}%
              </span>
            </div>
            <input
              id="wm-opacity"
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={value.watermarkOpacity}
              disabled={controlsDisabled}
              onChange={(e) =>
                onChange({ watermarkOpacity: Number(e.target.value) })
              }
              className="w-full accent-primary disabled:opacity-50"
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
