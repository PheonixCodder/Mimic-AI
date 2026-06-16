"use client";

import {
  AVATAR_STYLE_LABELS,
  type AvatarStyle,
} from "@/features/avatars/data/avatar-styles";
import type { Avatar } from "@/trpc/routers/avatars";
import { cn } from "@/lib/utils";

type AvatarPickerProps = {
  avatars: Avatar[];
  value: string | null;
  onChange: (avatarId: string) => void;
};

export function AvatarPicker({ avatars, value, onChange }: AvatarPickerProps) {
  if (!avatars.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No avatars available. Add avatars in the avatar library first.
      </p>
    );
  }

  return (
    <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
      {avatars.map((avatar) => {
        const styleLabel =
          AVATAR_STYLE_LABELS[avatar.style as AvatarStyle] ?? avatar.style;
        const imageSrc = `/api/avatars/${encodeURIComponent(avatar.id)}`;

        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onChange(avatar.id)}
            className={cn(
              "overflow-hidden rounded-xl border text-left transition-colors",
              value === avatar.id
                ? "border-primary ring-2 ring-primary/20"
                : "hover:bg-muted/50",
            )}
          >
            <img
              src={imageSrc}
              alt={avatar.name}
              className="aspect-square w-full object-cover"
            />
            <div className="space-y-0.5 p-2">
              <p className="truncate text-xs font-medium">{avatar.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {styleLabel}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
