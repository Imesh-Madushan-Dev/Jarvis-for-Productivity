"use client";

import { useOffline } from "next/offline";

export function OfflineIndicator() {
  const isOffline = useOffline();
  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-safe-b z-50 flex justify-center pb-4"
    >
      <p className="rounded-full border border-border bg-card px-4 py-2 text-sm text-card-foreground shadow-lg">
        Offline — your changes will send when you reconnect
      </p>
    </div>
  );
}
