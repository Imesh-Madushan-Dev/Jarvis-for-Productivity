"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { anchor, toDay } from "@/lib/day";
import { cn } from "@/lib/utils";

function label(day: string) {
  if (!day) return "Pick a date";
  return anchor(day).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * A date as `YYYY-MM-DD`.
 *
 * The value still travels in a hidden input, so the surrounding form keeps
 * reading `FormData` by name and knows nothing about the picker. Dates are
 * rebuilt from components at local noon (`anchor`) — parsing the string as an
 * instant would land on the previous day in any negative-offset zone.
 */
export function DateField({
  name,
  defaultValue = "",
  required,
  ariaLabel = "Date",
  className,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const [day, setDay] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  return (
    <>
      <input type="hidden" name={name} value={day} required={required} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-label={ariaLabel}
              className={cn(
                "t-press w-full justify-start gap-2 font-normal",
                !day && "text-muted-foreground",
                className,
              )}
            >
              <HugeiconsIcon icon={Calendar03Icon} className="size-4 shrink-0" />
              <span className="truncate">{label(day)}</span>
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            autoFocus
            selected={day ? anchor(day) : undefined}
            defaultMonth={day ? anchor(day) : undefined}
            onSelect={(date) => {
              if (!date) return;
              setDay(toDay(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}

/**
 * A local wall-clock instant as `YYYY-MM-DDTHH:mm` — the same string the
 * native control produced, so callers keep doing `new Date(value)`.
 *
 * Calendar for the day, a time input for the clock. Two controls rather than
 * one because that is how people actually think about "next Tuesday at 9".
 */
export function DateTimeField({
  name,
  defaultValue = "",
  required,
  ariaLabel = "Date and time",
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  ariaLabel?: string;
}) {
  const [day, setDay] = useState(defaultValue.slice(0, 10));
  const [time, setTime] = useState(defaultValue.slice(11, 16));
  const [open, setOpen] = useState(false);

  // Half a value is no value: a date with no time would silently mean midnight.
  const value = day && time ? `${day}T${time}` : "";

  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={value} required={required} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-label={`${ariaLabel} — date`}
              className={cn(
                "t-press min-w-0 flex-1 justify-start gap-2 font-normal",
                !day && "text-muted-foreground",
              )}
            >
              <HugeiconsIcon icon={Calendar03Icon} className="size-4 shrink-0" />
              <span className="truncate">{label(day)}</span>
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            autoFocus
            selected={day ? anchor(day) : undefined}
            defaultMonth={day ? anchor(day) : undefined}
            onSelect={(date) => {
              if (!date) return;
              setDay(toDay(date));
              // A date with no time is unusable, so seed a sensible one.
              if (!time) setTime("09:00");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <Input
        type="time"
        value={time}
        onChange={(event) => setTime(event.target.value)}
        aria-label={`${ariaLabel} — time`}
        className="w-28 shrink-0"
      />
    </div>
  );
}
