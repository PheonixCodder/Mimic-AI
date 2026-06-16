"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryState } from "nuqs";
import { useDebouncedCallback } from "use-debounce";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { videosSearchParams } from "@/features/videos/lib/params";

type VideosToolbarProps = {
  canCreate?: boolean;
};

export function VideosToolbar({ canCreate = true }: VideosToolbarProps) {
  const [query, setQuery] = useQueryState("query", videosSearchParams.query);
  const [localQuery, setLocalQuery] = useState(query);

  const debouncedSetQuery = useDebouncedCallback((value: string) => {
    void setQuery(value);
  }, 300);

  return (
    <div className="space-y-4">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="sm:max-w-sm">
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search videos..."
            value={localQuery}
            onChange={(event) => {
              setLocalQuery(event.target.value);
              debouncedSetQuery(event.target.value);
            }}
          />
        </InputGroup>

        {canCreate ? (
          <div className="sm:ml-auto">
            <Button
              size="sm"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link href="/dashboard/videos/new" />}
            >
              <Plus />
              Generate video
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
