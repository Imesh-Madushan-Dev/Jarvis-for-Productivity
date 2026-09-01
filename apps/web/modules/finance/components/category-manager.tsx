"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tag01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createCategory, updateCategory } from "../actions";
import {
  PASTEL_BAR,
  PASTEL_COLORS,
  type Category,
  type MoneyKind,
  type PastelColor,
} from "../schema";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MoneyKind>("expense");
  const [color, setColor] = useState<PastelColor>("mint");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createCategory({ name, kind, color });
      if (result.ok) setName("");
      else setError(result.error);
    });
  }

  function patch(id: string, change: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateCategory({ id, ...change });
      setError(result.ok ? null : result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="t-press gap-1.5">
            <HugeiconsIcon icon={Tag01Icon} className="size-4" />
            Categories
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
          <DialogDescription>
            The colour is the one this category gets in the chart. Archived
            categories stay on old entries but stop being offered.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={add} className="flex flex-col gap-3 py-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New category"
              aria-label="Category name"
              required
            />
            <Select
              value={kind}
              onValueChange={(value) =>
                setKind((value as MoneyKind | null) ?? "expense")
              }
            >
              <SelectTrigger className="w-full" aria-label="Kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={pending} className="t-press">
              Add
            </Button>
          </div>

          <div
            role="group"
            aria-label="Colour"
            className="flex flex-wrap gap-1.5"
          >
            {PASTEL_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setColor(swatch)}
                aria-label={swatch}
                aria-pressed={color === swatch}
                className={cn(
                  "t-press size-6 rounded-full ring-offset-2 ring-offset-background",
                  PASTEL_BAR[swatch],
                  color === swatch && "ring-2 ring-foreground/40",
                )}
              />
            ))}
          </div>
        </form>

        <div className="max-h-72 overflow-y-auto">
          {(["expense", "income"] as const).map((group) => (
            <section key={group} className="pb-3">
              <h3 className="pb-1.5 text-xs font-medium text-muted-foreground capitalize">
                {group}
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {categories
                  .filter((category) => category.kind === group)
                  .map((category) => (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() =>
                          patch(category.id, { archived: !category.archived })
                        }
                        title={
                          category.archived
                            ? "Restore this category"
                            : "Archive this category"
                        }
                        className={cn(
                          "t-press flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-accent",
                          category.archived &&
                            "text-muted-foreground line-through opacity-60",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "size-2 rounded-full",
                            PASTEL_BAR[category.color],
                          )}
                        />
                        {category.name}
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
