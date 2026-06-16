"use client";

import { useState } from "react";
import { useQueryState } from "nuqs";
import { useDebouncedCallback } from "use-debounce";
import { Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { voicesSearchParams } from "@/features/voices/lib/params";
import { VoiceCreateDialog } from "./voice-create-dialog";

type VoicesToolbarProps = {
  canCreate?: boolean;
};

export function VoicesToolbar({ canCreate = true }: VoicesToolbarProps) {
  const [query, setQuery] = useQueryState("query", voicesSearchParams.query);
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
            placeholder="Search voices..."
            value={localQuery}
            onChange={(event) => {
              setLocalQuery(event.target.value);
              debouncedSetQuery(event.target.value);
            }}
          />
        </InputGroup>

        {canCreate ? (
          <div className="sm:ml-auto">
            <VoiceCreateDialog>
              <Button size="sm" className="w-full sm:w-auto">
                <Sparkles />
                Custom voice
              </Button>
            </VoiceCreateDialog>
          </div>
        ) : null}
      </div>
    </div>
  );
}
