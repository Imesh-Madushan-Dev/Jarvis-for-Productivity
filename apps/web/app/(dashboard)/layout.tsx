import { Suspense } from "react";

import { AssistantSlot } from "@/components/assistant/assistant-slot";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SettingsDialogProvider } from "@/components/layout/settings-dialog";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/modules/profile/queries";

import { SettingsPanelsSlot } from "./settings/panels-slot";

/**
 * Cache Components requires everything that touches the request to sit inside
 * a Suspense boundary, so the sidebar's identity lookup is its own async slot
 * and the frame around it stays part of the static shell.
 */
async function SidebarSlot() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const displayName =
    profile.display_name ?? user.email?.split("@")[0] ?? "there";

  return (
    <AppSidebar
      displayName={displayName}
      email={user.email ?? ""}
      avatarUrl={profile.avatar_url}
    />
  );
}

function SidebarFallback() {
  return (
    <div className="hidden w-64 shrink-0 flex-col gap-3 p-3 md:flex">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="mt-3 flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <SettingsDialogProvider
        panels={
          <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
            {/* Rendered once with the layout, so opening the dialog is
                instant and never touches the router. */}
            <SettingsPanelsSlot deepLink={false} framed={false} />
          </Suspense>
        }
      >
        <Suspense fallback={<SidebarFallback />}>
          <SidebarSlot />
        </Suspense>

        <SidebarInset className="min-w-0">
     
       
          {/* The single place page gutters are set — pages bring no px of their
              own. pb-40 leaves room for the fixed assistant bar. The cap is
              generous rather than narrow: it only kicks in past ~1600px, so wide
              screens get breathing room instead of a dead zone. */}
          <div className="mx-auto w-full max-w-400 px-5 pb-40 sm:px-8">
            {children}
          </div>
        </SidebarInset>

        <AssistantSlot />
      </SettingsDialogProvider>
    </SidebarProvider>
  );
}
