import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

import { SettingsPanelsSlot } from "./panels-slot";

export const metadata = { title: "Settings" };

/** Awaits the tab inside the boundary, so the route still prerenders. */
async function Panels({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <SettingsPanelsSlot tab={tab} />;
}

/**
 * Settings normally opens as a dialog over whatever page you're on (see
 * `components/layout/settings-dialog.tsx`). This route stays for deep links
 * and bookmarks, rendering the same panels full-page.
 */
export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <PageShell title="Settings" description="Your profile and how days work.">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Panels searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
