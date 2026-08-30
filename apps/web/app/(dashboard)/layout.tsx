import { Suspense } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/modules/profile/queries";

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
      <Suspense fallback={<SidebarFallback />}>
        <SidebarSlot />
      </Suspense>

      <SidebarInset className="min-w-0">
        {/* Visible at every width: on desktop it is the collapse control, on
            mobile it opens the sheet. ⌘B and the rail do the same job. */}
        <div className="flex h-12 shrink-0 items-center gap-2 px-4 pt-safe-t">
          <SidebarTrigger className="t-press" />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
