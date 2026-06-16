import {
  Clapperboard,
  FileText,
  Film,
  FolderKanban,
  Home,
  LayoutTemplate,
  Mic2,
  Settings,
  UserRound,
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
      { title: "Projects", url: "/dashboard/projects", icon: FolderKanban },
      { title: "Videos", url: "/dashboard/videos", icon: Clapperboard },
      { title: "Clips", url: "/dashboard/clips", icon: Film },
      { title: "Scripts", url: "/dashboard/scripts", icon: FileText },
    ],
  },
  {
    label: "Assets",
    items: [
      { title: "Voices", url: "/dashboard/voices", icon: Mic2 },
      { title: "Avatars", url: "/dashboard/avatars", icon: UserRound },
      { title: "Templates", url: "/dashboard/templates", icon: LayoutTemplate },
    ],
  },
  {
    label: "Workspace",
    items: [
      { title: "Jobs", url: "/dashboard/jobs", icon: Workflow },
      { title: "Webhooks", url: "/dashboard/webhooks", icon: Webhook },
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
