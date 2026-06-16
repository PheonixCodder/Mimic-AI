"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type ProjectsToolbarProps = {
  canCreate: boolean;
  onCreate: () => void;
};

export function ProjectsToolbar({ canCreate, onCreate }: ProjectsToolbarProps) {
  return (
    <div className="flex items-center justify-end gap-4">

      {canCreate ? (
        <Button onClick={onCreate}>
          <Plus />
          New project
        </Button>
      ) : null}
    </div>
  );
}
