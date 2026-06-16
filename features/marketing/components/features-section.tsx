import { Mic, UserSquare2, Video, Zap, Lock, Sliders } from "lucide-react";

const FEATURES = [
  {
    icon: Mic,
    title: "Voice Cloning",
    description:
      "Clone any voice in minutes with F5-TTS. Upload a short sample and generate unlimited speech that sounds indistinguishable from the original.",
    accent: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: UserSquare2,
    title: "Avatar Creation",
    description:
      "Generate photorealistic AI avatars from a single portrait using Flux. Create a digital twin that looks exactly like you — or anyone you choose.",
    accent: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Video,
    title: "Video Generation",
    description:
      "Combine your voice and avatar into studio-quality talking-head videos. Add scripts, B-roll, captions, and brand overlays — all automated.",
    accent: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Zap,
    title: "Real-time Progress",
    description:
      "Every job streams live updates to your dashboard via Trigger.dev. Watch renders progress in real time — no more waiting in the dark.",
    accent: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    icon: Lock,
    title: "Self-hosted & Private",
    description:
      "Your data never leaves your infrastructure. Run on your own GPU cloud, your own storage, your own domain. Zero vendor lock-in.",
    accent: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: Sliders,
    title: "Full Control",
    description:
      "Script studio, brand kits, export formats, resolution presets, watermark engine — every knob is exposed. Build your exact workflow.",
    accent: "text-amber-600",
    bg: "bg-amber-50",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Everything you need
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-foreground">
            The complete AI video studio
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From voice to final export — every tool you need to produce professional AI video content at scale.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border bg-card p-6 hover:shadow-md hover:border-primary/20 transition-all duration-200"
              >
                <div className={`mb-4 inline-flex rounded-xl p-2.5 ${feature.bg}`}>
                  <Icon className={`h-5 w-5 ${feature.accent}`} />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
