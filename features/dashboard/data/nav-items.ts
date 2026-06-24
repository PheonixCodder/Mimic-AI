import {
  Bot,
  Clapperboard,
  Cpu,
  FileText,
  Film,
  FlaskConical,
  FolderKanban,
  Home,
  KeyRound,
  LayoutTemplate,
  MessageSquareText,
  Mic2,
  ScrollText,
  Settings,
  UserRound,
  Users,
  Webhook,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export type NavSection = {
  label?: string;
  items: NavItem[];
};

export const dashboardNavSections: NavSection[] = [
  {
    items: [
      { title: "Dashboard", url: "/dashboard", icon: Home },
      { title: "Co-Producer", url: "/dashboard/agent", icon: Bot },
      { title: "Projects", url: "/dashboard/projects", icon: FolderKanban },
      { title: "Videos", url: "/dashboard/videos", icon: Clapperboard },
      { title: "Clips", url: "/dashboard/clips", icon: Film },
      { title: "Scripts", url: "/dashboard/scripts", icon: FileText },
      { title: "Experiments", url: "/dashboard/experiments", icon: FlaskConical },
    ],
  },
  {
    label: "Assets",
    items: [
      { title: "Text to Speech", url: "/dashboard/text-to-speech", icon: MessageSquareText },
      { title: "Voices", url: "/dashboard/voices", icon: Mic2 },
      { title: "Avatars", url: "/dashboard/avatars", icon: UserRound },
      { title: "Models", url: "/dashboard/models", icon: Cpu },
      { title: "Templates", url: "/dashboard/templates", icon: LayoutTemplate },
    ],
  },
  {
    label: "Workspace",
    items: [
      { title: "Jobs", url: "/dashboard/jobs", icon: Workflow },
      { title: "Webhooks", url: "/dashboard/webhooks", icon: Webhook },
      { title: "Audit", url: "/dashboard/audit", icon: ScrollText },
      { title: "Team", url: "/dashboard/team", icon: Users },
      { title: "API", url: "/dashboard/api", icon: KeyRound },
      { title: "Settings", url: "/dashboard/settings", icon: Settings },
    ],
  },
];

export function isNavItemActive(pathname: string, url: string) {
  if (url === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === url || pathname.startsWith(`${url}/`);
}
