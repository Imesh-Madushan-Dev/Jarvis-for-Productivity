"use client";

import { useOptimistic, useState, useTransition } from "react";
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
  categoryColor,
  CATEGORY_PALETTE,
  nextFreeColor,
  type Category,
  type MoneyKind,
} from "../schema";

type CategoryPatch =
  | { type: "add"; row: Category }
  | { type: "archive"; id: string; archived: boolean };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MoneyKind>("expense");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Same deal as the transaction list: the chip appears the moment you hit
  // Add, and React rolls it back on its own if the write is rejected.
  const [rows, patch] = useOptimistic(
    categories,
    (current: Category[], change: CategoryPatch) =>
      change.type === "add"
        ? [...current, change.row]
        : current.map((row) =>
            row.id === change.id ? { ...row, archived: change.archived } : row,
          ),
  );

  const used = rows.map((category) => category.color);
  // Nothing picked yet means "the next free one", shown so the swatch row
  // always reflects what the new category will actually get.
  const chosen = color ?? nextFreeColor(used);

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const draft = { name: name.trim(), kind, color: chosen, icon: icon.trim() };
    setName("");
    setIcon("");
    setColor(null);

    startTransition(async () => {
      patch({
        type: "add",
        row: { id: `pending-${crypto.randomUUID()}`, archived: false, ...draft },
      });
      const result = await createCategory(draft);
      setError(result.ok ? null : result.error);
    });
  }

  function setArchived(id: string, archived: boolean) {
    startTransition(async () => {
      patch({ type: "archive", id, archived });
      const result = await updateCategory({ id, archived });
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
            Each one carries its own emoji and accent colour. Archived
            categories stay on old entries but stop being offered.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={add} className="flex flex-col gap-3 py-3">
          <div className="grid gap-2 sm:grid-cols-[3.5rem_minmax(0,1fr)_8rem_auto]">
            <Input
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              placeholder="🍔"
              aria-label="Emoji"
              maxLength={12}
              className="text-center"
            />
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
            aria-label="Accent colour"
            className="flex flex-wrap gap-1.5"
          >
            {CATEGORY_PALETTE.map((swatch) => {
              const taken = used.some(
                (value) => value.toUpperCase() === swatch,
              );
              return (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={taken ? `${swatch} (already used)` : swatch}
                  aria-pressed={chosen === swatch}
                  style={{ backgroundColor: swatch }}
                  className={cn(
                    "t-press size-6 rounded-full ring-offset-2 ring-offset-background",
                    // Used colours stay pickable but read as spoken for.
                    taken && "opacity-35",
                    chosen === swatch && "opacity-100 ring-2 ring-foreground/40",
                  )}
                />
              );
            })}
          </div>
        </form>

        <div className="max-h-72 overflow-y-auto">
          {(["expense", "income"] as const).map((group) => (
            <section key={group} className="pb-3">
              <h3 className="pb-1.5 text-xs font-medium text-muted-foreground capitalize">
                {group}
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {rows
                  .filter((category) => category.kind === group)
                  .map((category) => (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setArchived(category.id, !category.archived)
                        }
                        title={
                          category.archived
                            ? "Restore this category"
                            : "Archive this category"
                        }
                        className={cn(
                          "t-press flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-foreground hover:bg-accent",
                          category.archived &&
                            "text-muted-foreground line-through opacity-60",
                        )}
                        style={{
                          borderColor: `${categoryColor(category.color)}66`,
                          backgroundColor: `${categoryColor(category.color)}14`,
                        }}
                      >
                        <span aria-hidden="true">{category.icon || "•"}</span>
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
