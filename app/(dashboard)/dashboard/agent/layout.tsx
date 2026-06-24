import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Co-Producer Agent Studio | Mimic AI",
  description: "Orchestrate your AI avatar projects, scripts, voices, and rendering using our premium agent copilot.",
};

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
