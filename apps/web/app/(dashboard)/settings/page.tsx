import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/modules/profile/queries";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

async function Profile() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <SettingsForm
      displayName={profile.display_name ?? user.email?.split("@")[0] ?? ""}
      timezone={profile.timezone}
    />
  );
}

export default function SettingsPage() {
  return (
    <PageShell title="Settings" description="Your profile and how days work.">
      <Suspense fallback={<Skeleton className="h-80 max-w-lg rounded-2xl" />}>
        <Profile />
      </Suspense>
    </PageShell>
  );
}
