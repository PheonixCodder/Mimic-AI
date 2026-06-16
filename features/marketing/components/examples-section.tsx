import { Play, TrendingUp, GraduationCap, Briefcase, Globe, ShoppingBag } from "lucide-react";

const EXAMPLES = [
  {
    icon: TrendingUp,
    category: "Marketing",
    title: "Product launch announcements",
    description:
      "Generate polished spokesperson videos for every product update — consistent voice, on-brand avatar, zero studio time.",
    tag: "Most popular",
    tagColor: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: GraduationCap,
    category: "Education",
    title: "Course & tutorial content",
    description:
      "Turn written lessons into engaging video lectures. Your avatar explains concepts while your cloned voice narrates — at scale.",
    tag: null,
    tagColor: "",
  },
  {
    icon: Briefcase,
    category: "Corporate",
    title: "Internal comms & training",
    description:
      "Replace text emails with personalized video briefings from leadership. Localise training videos in any language without re-recording.",
    tag: null,
    tagColor: "",
  },
  {
    icon: Globe,
    category: "Media",
    title: "Multilingual localisation",
    description:
      "Dub content into 20+ languages while keeping the original speaker's voice and lip-sync. Reach global audiences from one master recording.",
    tag: "Coming in Phase 2",
    tagColor: "bg-sky-100 text-sky-700",
  },
  {
    icon: ShoppingBag,
    category: "E-commerce",
    title: "Product demo & review videos",
    description:
      "Generate hundreds of product-specific demo videos at scale. Same avatar, different scripts — automated overnight.",
    tag: null,
    tagColor: "",
  },
  {
    icon: Play,
    category: "Creators",
    title: "Social & short-form content",
    description:
      "Batch-produce TikToks, YouTube Shorts, and Reels. Your digital twin posts while you sleep.",
    tag: null,
    tagColor: "",
  },
];

export function ExamplesSection() {
  return (
    <section id="examples" className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Use cases
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-foreground">
            Built for every kind of creator
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From solo creators to enterprise teams — Mimic AI adapts to your workflow and scale.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.map((ex) => {
            const Icon = ex.icon;
            return (
              <div
                key={ex.title}
                className="relative rounded-2xl border border-border bg-card p-6 hover:shadow-md hover:border-primary/20 transition-all duration-200 flex flex-col gap-3"
              >
                {ex.tag && (
                  <span className={`absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${ex.tagColor}`}>
                    {ex.tag}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {ex.category}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground leading-snug">
                  {ex.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {ex.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
