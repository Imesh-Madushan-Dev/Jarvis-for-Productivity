"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { createTransaction } from "../actions";
import type { Category, MoneyKind } from "../schema";

const UNCATEGORISED = "none";

export function AddTransactionDialog({
  categories,
  today,
}: {
  categories: Category[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MoneyKind>("expense");
  const [categoryId, setCategoryId] = useState(UNCATEGORISED);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Picking a category of the wrong kind is the one mistake this form can make,
  // so the list simply never offers one.
  const options = categories.filter((c) => c.kind === kind && !c.archived);

  function pickKind(next: MoneyKind) {
    setKind(next);
    setCategoryId(UNCATEGORISED);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await createTransaction({
        kind,
        amount: String(form.get("amount") ?? ""),
        occurredOn: String(form.get("occurredOn") ?? today),
        categoryId: categoryId === UNCATEGORISED ? null : categoryId,
        note: String(form.get("note") ?? ""),
      });

      if (result.ok) {
        setOpen(false);
        setCategoryId(UNCATEGORISED);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="t-press gap-1.5">
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
            Add entry
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Add entry</DialogTitle>
            <DialogDescription>
              Money in or out, against the day it happened.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <div
              role="group"
              aria-label="Type"
              className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
            >
              {(["expense", "income"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => pickKind(option)}
                  aria-pressed={kind === option}
                  className={cn(
                    "t-press rounded-md px-3 py-1.5 text-sm capitalize",
                    kind === option
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                name="amount"
                required
                autoFocus
                autoComplete="off"
                inputMode="decimal"
                placeholder="0.00"
                aria-label="Amount"
              />
              {/* Native date input: correct on every platform, zero bundle. */}
              <Input
                name="occurredOn"
                type="date"
                defaultValue={today}
                required
                aria-label="Date"
              />
            </div>

            <Select
              value={categoryId}
              onValueChange={(value) => setCategoryId(value ?? UNCATEGORISED)}
            >
              <SelectTrigger className="w-full" aria-label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNCATEGORISED}>Uncategorised</SelectItem>
                {options.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input name="note" placeholder="Note (optional)" aria-label="Note" />

            {error ? (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending} className="t-press">
              {pending ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
