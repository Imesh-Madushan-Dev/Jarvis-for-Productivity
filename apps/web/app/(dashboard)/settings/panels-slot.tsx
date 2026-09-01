import { requireUser } from "@/lib/auth";
import { getProfile } from "@/modules/profile/queries";

import { AccountSection } from "./sections/account";
import { AppearanceSection } from "./sections/appearance";
import { GeneralSection } from "./sections/general";
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
            displayName={profile.display_name ?? user.email?.split("@")[0] ?? ""}
            timezone={profile.timezone}
            currency={profile.currency}
          />
        ),
        appearance: <AppearanceSection />,
        account: <AccountSection email={user.email ?? ""} />,
      }}
    />
  );
}
