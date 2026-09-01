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
import type {
  Category,
  CreateTransactionInput,
  MoneyKind,
  TransactionListItem,
} from "../schema";

const UNCATEGORISED = "none";

/**
 * One form, two verbs. Creating and editing differ only in what the fields
 * start as and which handler runs, so they share a component.
 *
 * The write itself belongs to the board, not to this dialog: the board holds
 * the optimistic list, so it has to be the thing that fires the action. The
 * dialog closes as soon as the handler is called, not when the server answers.
 */
function TransactionForm({
  categories,
  today,
  entry,
  onSubmit,
  onDone,
}: {
  categories: Category[];
  today: string;
  entry?: TransactionListItem;
  onSubmit: (values: CreateTransactionInput) => Promise<string | null>;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<MoneyKind>(entry?.kind ?? "expense");
  const [categoryId, setCategoryId] = useState(
    entry?.category_id ?? UNCATEGORISED,
  );
  const [error, setError] = useState<string | null>(null);

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

    const amount = String(form.get("amount") ?? "").trim();
    // The one check worth doing here: an optimistic row for an unparseable
    // amount would appear and then vanish, which reads as a bug.
    if (!Number.isFinite(Number(amount.replace(/[, ]/g, ""))) || Number(amount) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    void onSubmit({
      kind,
      amount,
      occurredOn: String(form.get("occurredOn") ?? today),
      categoryId: categoryId === UNCATEGORISED ? null : categoryId,
      note: String(form.get("note") ?? ""),
    });

    onDone();
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>{entry ? "Edit entry" : "Add entry"}</DialogTitle>
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
            defaultValue={entry ? (entry.amount_cents / 100).toFixed(2) : ""}
          />
          {/* Native date input: correct on every platform, zero bundle. */}
          <Input
            name="occurredOn"
            type="date"
            required
            aria-label="Date"
            defaultValue={entry?.occurred_on ?? today}
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
                {category.icon ? `${category.icon} ` : ""}
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          name="note"
          placeholder="Note (optional)"
          aria-label="Note"
          defaultValue={entry?.note ?? ""}
        />

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="submit" className="t-press">
          {entry ? "Save" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddTransactionDialog({
  categories,
  today,
  onSubmit,
}: {
  categories: Category[];
  today: string;
  onSubmit: (values: CreateTransactionInput) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);

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
        {/* Keyed so a cancelled draft never reappears on the next open. */}
        {open ? (
          <TransactionForm
            categories={categories}
            today={today}
            onSubmit={onSubmit}
            onDone={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function EditTransactionDialog({
  entry,
  categories,
  today,
  onSubmit,
  onClose,
}: {
  entry: TransactionListItem | null;
  categories: Category[];
  today: string;
  onSubmit: (id: string, values: CreateTransactionInput) => Promise<string | null>;
  onClose: () => void;
}) {
  return (
    <Dialog open={entry !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {entry ? (
          <TransactionForm
            key={entry.id}
            entry={entry}
            categories={categories}
            today={today}
            onSubmit={(values) => onSubmit(entry.id, values)}
            onDone={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
