import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

import { SettingsPanelsSlot } from "./panels-slot";

export const metadata = { title: "Settings" };

/**
 * Settings normally opens as a dialog over whatever page you're on (see
 * `components/layout/settings-dialog.tsx`). This route stays for deep links
 * and bookmarks, rendering the same panels full-page.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  return (
    <PageShell title="Settings" description="Your profile and how days work.">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <SettingsPanelsSlot tab={tab} />
      </Suspense>
    </PageShell>
  );
}
