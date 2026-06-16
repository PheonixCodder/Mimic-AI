export type QuickAction = {
  title: string;
  description: string;
  gradient: string;
  href: string;
};

export const quickActions: QuickAction[] = [
  {
    title: "Create a video",
    description: "Start a new AI video from script, avatar, and voice",
    gradient: "from-green-500 to-green-100",
    href: "/dashboard/videos/new",
  },
  {
    title: "Clone a voice",
    description: "Upload a sample and build a custom voice for narration",
    gradient: "from-emerald-400 to-emerald-50",
    href: "/dashboard/voices",
  },
  {
    title: "Create an avatar",
    description: "Generate a talking avatar for your next production",
    gradient: "from-teal-400 to-teal-50",
    href: "/dashboard/avatars",
  },
  {
    title: "Write a script",
    description: "Draft and refine scripts before generation",
    gradient: "from-lime-400 to-lime-50",
    href: "/dashboard/scripts",
  },
  {
    title: "Browse templates",
    description: "Use brand kits and layouts to move faster",
    gradient: "from-green-600 to-green-100",
    href: "/dashboard/templates",
  },
  {
    title: "View jobs",
    description: "Track async generation progress across the studio",
    gradient: "from-emerald-500 to-emerald-100",
    href: "/dashboard/jobs",
  },
];
