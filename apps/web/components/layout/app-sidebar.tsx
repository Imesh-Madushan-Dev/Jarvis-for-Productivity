"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Attachment01Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  DashboardSquare01Icon,
  HelpCircleIcon,
  LayoutTable01Icon,
  Note01Icon,
  Notebook01Icon,
  PieChart01Icon,
  Settings02Icon,
  Tag01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { QuickSearch } from "./quick-search";
import { useOpenSettings } from "./settings-dialog";
import { UserMenu } from "./user-menu";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Note01Icon;
  ready: boolean;
  /** Opens the settings dialog over the current page instead of navigating. */
  dialog?: boolean;
};

// ponytail: `ready: false` items have no data model yet, so they render
// disabled — a nav item that goes nowhere is worse than one that says so.
const PRIMARY_NAV: NavItem[] = [
  { label: "Overview", href: "/", icon: DashboardSquare01Icon, ready: true },
  { label: "Notes", href: "/notes", icon: Note01Icon, ready: true },
  { label: "Calendar", href: "/calendar", icon: Calendar03Icon, ready: true },
  { label: "Tasks", href: "/tasks", icon: CheckmarkCircle02Icon, ready: true },
  { label: "Money", href: "/finance", icon: PieChart01Icon, ready: true },
  { label: "Files", href: "/files", icon: Attachment01Icon, ready: false },
  {
    label: "Templates",
    href: "/templates",
    icon: LayoutTable01Icon,
    ready: false,
  },
];

const LIBRARY_NAV: NavItem[] = [
  { label: "Notebook", href: "/notebook", icon: Notebook01Icon, ready: false },
  { label: "Tags", href: "/tags", icon: Tag01Icon, ready: false },
  {
    label: "Shared with me",
    href: "/shared",
    icon: UserGroupIcon,
    ready: false,
  },
];

const FOOTER_NAV: NavItem[] = [
  {
    label: "Settings",
    href: "/settings",
    icon: Settings02Icon,
    ready: true,
    dialog: true,
  },
  { label: "Help Center", href: "/help", icon: HelpCircleIcon, ready: false },
];

function NavList({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const openSettings = useOpenSettings();

  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          {item.dialog && openSettings ? (
            <SidebarMenuButton
              onClick={openSettings}
              tooltip={item.label}
              className="t-press"
            >
              <HugeiconsIcon icon={item.icon} className="size-4" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          ) : item.ready ? (
            <SidebarMenuButton
              render={<Link href={item.href} />}
              isActive={pathname === item.href}
              tooltip={item.label}
              className="t-press"
            >
              <HugeiconsIcon icon={item.icon} className="size-4" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton
              aria-disabled
              tooltip={`${item.label} — not built yet`}
              className="cursor-not-allowed opacity-50"
              onClick={(event) => event.preventDefault()}
            >
              <HugeiconsIcon icon={item.icon} className="size-4" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AppSidebar({
  displayName,
  email,
  avatarUrl,
}: {
  displayName: string;
  email: string;
  avatarUrl: string | null;
}) {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-2">
        <UserMenu
          displayName={displayName}
          email={email}
          avatarUrl={avatarUrl}
        />
        <QuickSearch />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavList items={PRIMARY_NAV} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <NavList items={LIBRARY_NAV} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavList items={FOOTER_NAV} />
      </SidebarFooter>

      {/* Drag/click the edge to collapse, in addition to the trigger and ⌘B. */}
      <SidebarRail />
    </Sidebar>
  );
}
