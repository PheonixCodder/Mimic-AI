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
import { scriptsSearchParams } from "@/features/scripts/lib/params";

type ScriptsToolbarProps = {
  canCreate?: boolean;
};

export function ScriptsToolbar({ canCreate = true }: ScriptsToolbarProps) {
  const [query, setQuery] = useQueryState("query", scriptsSearchParams.query);
  const [localQuery, setLocalQuery] = useState(query);

  const debouncedSetQuery = useDebouncedCallback((value: string) => {
    void setQuery(value);
  }, 300);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <InputGroup className="sm:max-w-sm">
        <InputGroupAddon>
          <Search className="size-4" />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search scripts..."
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
            render={<Link href="/dashboard/scripts/new" />}
          >
            <Plus />
            New script
          </Button>
        </div>
      ) : null}
    </div>
  );
}
