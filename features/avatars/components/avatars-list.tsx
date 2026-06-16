import { UserRound, Users } from "lucide-react";

import { AvatarCard } from "./avatar-card";
import type { AvatarItem } from "./avatar-card";

type AvatarsListProps = {
  title: string;
  avatars: AvatarItem[];
  canDelete?: boolean;
};

export function AvatarsList({
  title,
  avatars,
  canDelete = false,
}: AvatarsListProps) {
  if (!avatars.length) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>

        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <div className="relative flex h-14 w-32 items-center justify-center">
            <div className="absolute left-0 -rotate-30 rounded-full bg-muted p-4">
              <UserRound className="size-5 text-muted-foreground" />
            </div>

            <div className="relative z-10 rounded-full bg-foreground p-4">
              <Users className="size-5 text-background" />
            </div>

            <div className="absolute right-0 rotate-30 rounded-full bg-muted p-4">
              <UserRound className="size-5 text-muted-foreground" />
            </div>
          </div>

          <p className="text-lg font-semibold tracking-tight text-foreground">
            No avatars found
          </p>

          <p className="max-w-md text-center text-sm text-muted-foreground">
            {title} will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {avatars.map((avatar) => (
          <AvatarCard
            key={avatar.id}
            avatar={avatar}
            canDelete={canDelete}
          />
        ))}
      </div>
    </div>
  );
}
