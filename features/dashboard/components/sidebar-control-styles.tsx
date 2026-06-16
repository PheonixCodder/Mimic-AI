import { cn } from "@/lib/utils";

export const sidebarControlButtonClassName = cn(
  "h-9 w-full gap-2 rounded-md border border-border bg-white px-2 shadow-[0px_1px_1.5px_0px_rgba(44,54,53,0.03)]",
  "transition-colors hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent",
  "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:w-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1!",
);

export const sidebarControlSkeletonClassName =
  "h-9 w-full rounded-md border border-border bg-white group-data-[collapsible=icon]:size-8";

export function WorkspaceAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-xs font-semibold text-primary",
        className,
      )}
    >
      {initials}
    </div>
  );
}
