"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, SparklesIcon } from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ModelInfo } from "@/lib/ai/models";

const TIERS = [
  { key: "fast", label: "Fast" },
  { key: "standard", label: "Standard" },
  { key: "thinking", label: "Thinking" },
] as const;

export function ModelPicker({
  models,
  value,
  onChange,
}: {
  models: ModelInfo[];
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = models.find((model) => model.id === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Choose model"
            className="t-press inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="max-w-24 truncate">
              {selected?.label ?? "No model"}
            </span>
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />
          </button>
        }
      />

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {TIERS.map((tier, index) => {
            const tierModels = models.filter(
              (model) => model.tier === tier.key,
            );
            if (tierModels.length === 0) return null;

            return (
              <div key={tier.key}>
                {index > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuLabel className="text-muted-foreground">
                  {tier.label}
                </DropdownMenuLabel>
                {tierModels.map((model) => (
                  <DropdownMenuRadioItem
                    key={model.id}
                    value={model.id}
                    disabled={!model.available}
                    className="gap-2"
                  >
                    <HugeiconsIcon
                      icon={SparklesIcon}
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                    <span className="flex-1 truncate">{model.label}</span>
                    {/* An unusable model is shown, not hidden - knowing it
                        exists is the point of the "add a key" nudge. */}
                    {model.available ? null : (
                      <Badge variant="secondary" className="text-[0.65rem]">
                        No key
                      </Badge>
                    )}
                  </DropdownMenuRadioItem>
                ))}
              </div>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
