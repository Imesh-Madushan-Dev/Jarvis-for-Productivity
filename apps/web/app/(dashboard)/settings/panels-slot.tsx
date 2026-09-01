import { requireUser } from "@/lib/auth";
import { getProfile } from "@/modules/profile/queries";

import { AccountSection } from "./sections/account";
import { AppearanceSection } from "./sections/appearance";
import { GeneralSection } from "./sections/general";
import { NotificationsSection } from "./sections/notifications";
import { toSectionId } from "./sections";
import { SettingsPanels } from "./settings-panels";

/**
 * The one server-rendered copy of settings. The `/settings` route renders it
 * as a page; the dashboard layout renders it into the settings dialog, so
 * opening settings from the sidebar costs no navigation and no request.
 */
export async function SettingsPanelsSlot({
  tab,
  deepLink = true,
  framed = true,
}: {
  tab?: string;
  deepLink?: boolean;
  framed?: boolean;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <SettingsPanels
      initialSection={toSectionId(tab)}
      deepLink={deepLink}
      framed={framed}
      panels={{
        general: (
          <GeneralSection
            timezone={profile.timezone}
            currency={profile.currency}
          />
        ),
        appearance: <AppearanceSection />,
        notifications: (
          <NotificationsSection
            publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
          />
        ),
        account: (
          <AccountSection
            email={user.email ?? ""}
            displayName={
              profile.display_name ?? user.email?.split("@")[0] ?? ""
            }
          />
        ),
      }}
    />
  );
}
