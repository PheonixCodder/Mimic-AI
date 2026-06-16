import { FileText, Mic2, Clapperboard, Download } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: FileText,
    title: "Write your script",
    description:
      "Use the built-in script studio to write, edit, and organise your content. Apply a template or start from scratch — AI-assisted editing included.",
  },
  {
    number: "02",
    icon: Mic2,
    title: "Clone your voice",
    description:
      "Upload a 30-second audio sample. Mimic AI clones it using F5-TTS and stores it in your voice library. Use it on any video you generate.",
  },
  {
    number: "03",
    icon: Clapperboard,
    title: "Generate your video",
    description:
      "Pick your avatar, assign your voice, attach your script. Hit generate — Mimic AI handles talking-head synthesis, captions, and B-roll automatically.",
  },
  {
    number: "04",
    icon: Download,
    title: "Export & deliver",
    description:
      "Download in 1080p, 4K, or custom resolution. Choose MP4, MOV, or WebM. Add your watermark or brand overlay. Deliver anywhere.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-muted/30">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Simple by design
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-foreground">
            From idea to video in 4 steps
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            No video editing experience required. Mimic AI handles the technical pipeline — you focus on the content.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div
            aria-hidden
            className="absolute top-10 left-[calc(12.5%+1rem)] right-[calc(12.5%+1rem)] hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent lg:block"
          />

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="flex flex-col items-center text-center gap-4">
                  {/* Icon circle */}
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-accent">
                    <Icon className="h-7 w-7 text-primary" />
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {step.number.replace("0", "")}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1.5">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
