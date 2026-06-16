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
import { clipsSearchParams } from "@/features/clips/lib/params";

type ClipsToolbarProps = {
  canCreate?: boolean;
};

export function ClipsToolbar({ canCreate = true }: ClipsToolbarProps) {
  const [query, setQuery] = useQueryState("query", clipsSearchParams.query);
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
            placeholder="Search clips..."
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
              render={<Link href="/dashboard/clips/generate" />}
            >
              <Plus />
              Generate clip
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
