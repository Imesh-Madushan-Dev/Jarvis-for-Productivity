import type { IconSvgElement } from "@hugeicons/react";
import {
  Settings02Icon,
  Notification03Icon,
  PaintBoardIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";

/**
 * Every settings section, in rail order. `id` is the `?tab=` value, so it is
 * part of the URL contract - the sidebar and any deep link aim at these.
 */
export type SectionId = "general" | "appearance" | "notifications" | "account";

export type Section = {
  id: SectionId;
  label: string;
  group: "Workspace" | "Account";
  icon: IconSvgElement;
  description: string;
};

export const SECTIONS: Section[] = [
  {
    id: "general",
    label: "General",
    group: "Workspace",
    icon: Settings02Icon,
    description: "The timezone every day is measured in, and your currency.",
  },
  {
    id: "appearance",
    label: "Appearance",
    group: "Workspace",
    icon: PaintBoardIcon,
    description: "How the dashboard looks on this device.",
  },
  {
    id: "notifications",
    label: "Reminders",
    group: "Workspace",
    icon: Notification03Icon,
    description: "Where reminders are delivered.",
  },
  {
    id: "account",
    label: "Account",
    group: "Account",
    icon: UserCircleIcon,
    description: "Your name, sign-in details and session.",
  },
];

export const DEFAULT_SECTION: SectionId = "general";

/** Guards `?tab=` before it indexes anything - an unknown value opens General. */
export function toSectionId(value: string | undefined): SectionId {
  return SECTIONS.some((s) => s.id === value) ? (value as SectionId) : DEFAULT_SECTION;
}
