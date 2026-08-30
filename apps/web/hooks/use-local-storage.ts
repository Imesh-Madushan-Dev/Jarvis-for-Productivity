"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-device UI state only — never anything the server is the source of truth
 * for. Reads happen after mount so the first client paint matches the server's.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // Private mode, blocked storage, or corrupt JSON: keep the default.
    }
    setHydrated(true);
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage full or blocked — the in-memory value still works.
      }
    },
    [key],
  );

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Nothing to recover.
    }
  }, [key]);

  return { value, setValue: update, clear, hydrated };
}
