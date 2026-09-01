"use client";

import { useEffect } from "react";

/** How often an open tab asks the server to fire anything that came due. */
const EVERY_MS = 60_000;

/**
 * Registers the service worker and, while a tab is open and visible, nudges
 * the dispatcher once a minute.
 *
 * This is not the delivery mechanism — the scheduler is (see
 * `app/api/reminders/dispatch/route.ts`). It is what makes reminders fire
 * while you are using the app and before any cron is wired up, and it costs
 * one tiny request a minute. Hidden tabs skip it: a phone in a pocket should
 * not be polling.
 */
export function ReminderSync() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // No service worker means no notifications; the rest of the app is fine.
    });

    let cancelled = false;

    const tick = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      if (Notification.permission !== "granted") return;
      try {
        await fetch("/api/reminders/dispatch", { method: "POST" });
      } catch {
        // Offline, or the route is not configured. Either way, try again later.
      }
    };

    void tick();
    const id = setInterval(tick, EVERY_MS);
    document.addEventListener("visibilitychange", tick);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  return null;
}
