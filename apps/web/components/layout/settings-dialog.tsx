"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SettingsDialogContext = createContext<(() => void) | null>(null);

/**
 * Settings opens over whatever page you're on instead of navigating to one.
 *
 * The panels are rendered on the server once, in the dashboard layout, and
 * handed here as a prop — so opening the dialog costs no request, and the
 * `/settings` route still works as a deep link for anyone who lands on it.
 */
export function SettingsDialogProvider({
  panels,
  children,
}: {
  panels: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <SettingsDialogContext.Provider value={() => setOpen(true)}>
      {children}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto sm:max-w-3xl">
          <DialogHeader className="pb-4">
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Your profile and how days work.
            </DialogDescription>
          </DialogHeader>
          {panels}
        </DialogContent>
      </Dialog>
    </SettingsDialogContext.Provider>
  );
}

/** Null outside the dashboard layout, so callers fall back to the route. */
export function useOpenSettings() {
  return useContext(SettingsDialogContext);
}
