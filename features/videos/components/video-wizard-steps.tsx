"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export const WIZARD_STEPS = [
  { id: 1, label: "Basics" },
  { id: 2, label: "Script" },
  { id: 3, label: "Cast" },
  { id: 4, label: "Output" },
  { id: 5, label: "Review" },
] as const;

type VideoWizardStepsProps = {
  currentStep: number;
};

export function VideoWizardSteps({ currentStep }: VideoWizardStepsProps) {
  const progress = (currentStep / WIZARD_STEPS.length) * 100;

  return (
    <div className="space-y-4">
      <Progress value={progress} />
      <ol className="flex flex-wrap gap-2">
        {WIZARD_STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const isComplete = step.id < currentStep;

          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                isActive && "border-primary bg-primary/5 text-primary",
                isComplete && !isActive && "border-border text-muted-foreground",
                !isActive && !isComplete && "border-border text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px]",
                  isActive && "bg-primary text-primary-foreground",
                  isComplete && !isActive && "bg-muted text-foreground",
                  !isActive && !isComplete && "bg-muted",
                )}
              >
                {step.id}
              </span>
              {step.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
