import {
  Clapperboard,
  FileText,
  FolderKanban,
  LayoutTemplate,
  Mic2,
  Settings,
  UserRound,
  Webhook,
  Workflow,
} from "lucide-react";

import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";

const sections = {
  projects: {
    title: "Projects",
    description: "Organize videos, scripts, and assets by project.",
    icon: FolderKanban,
  },
  videos: {
    title: "Videos",
    description: "Create, review, and export AI-generated videos.",
    icon: Clapperboard,
  },
  scripts: {
    title: "Scripts",
    description: "Draft and manage scripts for your productions.",
    icon: FileText,
  },
  voices: {
    title: "Voices",
    description: "Browse voice library and clone custom voices.",
    icon: Mic2,
  },
  avatars: {
    title: "Avatars",
    description: "Manage talking avatars for your video studio.",
    icon: UserRound,
  },
  templates: {
    title: "Templates",
    description: "Brand kits, layouts, and reusable video templates.",
    icon: LayoutTemplate,
  },
  jobs: {
    title: "Jobs",
    description: "Monitor async generation jobs and progress.",
    icon: Workflow,
  },
  webhooks: {
    title: "Webhooks",
    description: "Configure outbound events for your workspace.",
    icon: Webhook,
  },
  settings: {
    title: "Settings",
    description: "Workspace preferences, billing, and account settings.",
    icon: Settings,
  },
} as const;

type SectionKey = keyof typeof sections;

export function createSectionPage(key: SectionKey) {
  const section = sections[key];

  return function SectionPage() {
    return (
      <DashboardPageShell
        title={section.title}
        description={section.description}
        icon={section.icon}
        breadcrumbs={[{ label: section.title }]}
      />
    );
  };
}
