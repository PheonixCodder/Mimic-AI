"use client";

import { Button } from "@/components/ui/button";
import { LoaderIcon, Mic2 } from "lucide-react";

export function GenerateButton({
  size,
  disabled,
  isSubmitting,
  onSubmit,
  className,
}: {
  size?: "default" | "sm";
  disabled: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  className?: string;
}) {
  return (
    <Button
      size={size}
      className={className}
      onClick={onSubmit}
      disabled={disabled}
    >
      {isSubmitting ? (
        <>
          <LoaderIcon className="size-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Mic2 className="size-4" />
          Generate Speech
        </>
      )}
    </Button>
  );
}