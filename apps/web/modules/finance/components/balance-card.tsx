"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { setWalletBalance } from "../actions";
import { formatMoney } from "../schema";

/**
 * What the wallet holds right now: everything recorded, plus whatever was
 * there before the first entry. Correcting it writes that opening figure —
 * no phantom "adjustment" transaction ever appears in the list.
 */
export function BalanceCard({
  balance,
  currency,
}: {
  balance: number;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("balance") ?? "");
    setError(null);

    startTransition(async () => {
      const result = await setWalletBalance({ balance: value });
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Wallet balance
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Correct the wallet balance"
          className="t-press -mt-1 rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" />
        </button>
      </div>

      <p
        className={cn(
          "mt-2 text-3xl font-semibold tracking-tight tabular-nums",
          balance < 0 && "text-rose-600 dark:text-rose-400",
        )}
      >
        {balance < 0 ? "−" : ""}
        {formatMoney(Math.abs(balance), currency)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Everything recorded, plus your starting amount.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Wallet balance</DialogTitle>
              <DialogDescription>
                What you actually have right now. Your entries stay as they are;
                only the starting amount moves.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Input
                name="balance"
                required
                autoFocus
                autoComplete="off"
                inputMode="decimal"
                aria-label="Balance"
                defaultValue={(balance / 100).toFixed(2)}
              />
              {error ? (
                <p role="alert" className="pt-2 text-xs text-destructive">
                  {error}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending} className="t-press">
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
