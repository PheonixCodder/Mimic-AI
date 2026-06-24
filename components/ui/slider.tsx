import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
}

export function Slider({
  value,
  onValueChange,
  className,
  min = 0,
  max = 1,
  step = 0.1,
  ...props
}: SliderProps) {
  const percentage = ((value[0] - min) / (max - min)) * 100

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center py-2", className)}>
      <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
        <div
          className="absolute h-full bg-primary"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onValueChange([parseFloat(e.target.value)])}
        className="absolute w-full h-4 opacity-0 cursor-pointer z-10"
        {...props}
      />
      {/* Decorative Thumb */}
      <div
        className="absolute top-1/2 -translate-y-1/2 size-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 pointer-events-none"
        style={{ left: `calc(${percentage}% - 8px)` }}
      />
    </div>
  )
}
