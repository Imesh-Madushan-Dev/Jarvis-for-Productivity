import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/modules/profile/queries";

import { AccountSection } from "./sections/account";
import { AppearanceSection } from "./sections/appearance";
import { GeneralSection } from "./sections/general";
import { toSectionId } from "./sections";
import { SettingsPanels } from "./settings-panels";

export const metadata = { title: "Settings" };

async function Panels({ tab }: { tab: string | undefined }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <SettingsPanels
      initialSection={toSectionId(tab)}
      panels={{
        general: (
          <GeneralSection
            displayName={
              profile.display_name ?? user.email?.split("@")[0] ?? ""
            }
            timezone={profile.timezone}
          />
        ),
        appearance: <AppearanceSection />,
        account: <AccountSection email={user.email ?? ""} />,
      }}
    />
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  return (
    <PageShell title="Settings" description="Your profile and how days work.">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Panels tab={tab} />
      </Suspense>
    </PageShell>
  );
}
