"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
} from "@/modules/reminders/actions";

import { PanelFooter, PanelHeading, Row, RowGroup } from "../rows";

/** VAPID keys travel as base64url; the browser wants raw bytes. */
function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

type State = "unsupported" | "denied" | "off" | "on";

export function NotificationsSection({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Read after mount: permission is per device, and the server cannot know it.
  useEffect(() => {
    async function read() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      setState(existing ? "on" : "off");
    }

    void read();
  }, []);

  function enable() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        // Must be called from a click: browsers reject a permission prompt
        // that no one asked for.
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return;
        }

        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const json = subscription.toJSON();
        const result = await savePushSubscription({
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          userAgent: navigator.userAgent,
        });

        if (result.ok) {
          setState("on");
          setMessage("This device will receive reminders.");
        } else {
          setError(result.error);
        }
      } catch {
        setError("This browser wouldn't complete the subscription.");
      }
    });
  }

  function disable() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
      setMessage("Reminders are off on this device.");
    });
  }

  function test() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestPush();
      if (result.ok) setMessage("Sent — it should appear in a moment.");
      else setError(result.error);
    });
  }

  return (
    <div>
      <PanelHeading
        title="Reminders"
        description="Notifications are granted per device, so this has to be turned on wherever you want them."
      />

      <RowGroup>
        <Row
          label="This device"
          description={
            state === "unsupported"
              ? "This browser can't receive push notifications. On iPhone, add Moly to your Home Screen first."
              : state === "denied"
                ? "Notifications are blocked in the browser's site settings — that has to be undone there."
                : "Reminders on tasks and events arrive here, even when Moly is closed."
          }
        >
          {state === "on" ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={test}
                disabled={pending}
                className="t-press"
              >
                Send a test
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={disable}
                disabled={pending}
                className="t-press"
              >
                Turn off
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={enable}
              disabled={pending || state === "unsupported" || state === "denied"}
              className="t-press"
            >
              {state === null ? "Checking…" : "Turn on"}
            </Button>
          )}
        </Row>
      </RowGroup>

      <PanelFooter>
        {error ? (
          <p role="alert" className="mr-auto text-xs text-destructive">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="mr-auto text-xs text-muted-foreground">
            {message}
          </p>
        ) : null}
      </PanelFooter>
    </div>
  );
}
