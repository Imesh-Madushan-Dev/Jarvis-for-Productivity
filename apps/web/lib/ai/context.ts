import { todayInZone, zonedDayRange } from "@/lib/day";
import { createClient } from "@/lib/supabase/server";

const PAGE_NAMES: Record<string, string> = {
  "/": "Overview dashboard",
  "/notes": "Notes",
  "/calendar": "Calendar",
  "/tasks": "Tasks",
  "/finance": "Money tracker",
  "/settings": "Settings",
};

/**
 * The assistant's situational awareness: who the user is, what day it is where
 * they are, what is already on today's plan, and which page they're looking at.
 *
 * Queried directly rather than through modules/
 * /queries.ts - those carry
 * `use cache: private`, which is a render-time directive and has no meaning in
 * a route handler. These are also deliberately smaller reads.
 */
export async function buildAwareness(userId: string, pathname: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,timezone,currency,opening_balance_cents")
    .eq("id", userId)
    .maybeSingle();

  const timezone = profile?.timezone ?? "UTC";
  const day = todayInZone(timezone);
  const { start, end } = zonedDayRange(day, timezone);

  const monthFrom = `${day.slice(0, 7)}-01`;

  const [tasks, events, notes, categories, money, walletNet] = await Promise.all([
    supabase
      .from("tasks")
      .select("id,title,status,planned_minutes,remind_at")
      .eq("user_id", userId)
      .eq("planned_date", day)
      .order("position")
      .limit(50),
    supabase
      .from("events")
      .select("id,title,starts_at,ends_at")
      .eq("user_id", userId)
      .gte("starts_at", start)
      .lt("starts_at", end)
      .order("starts_at")
      .limit(25),
    supabase
      .from("notes")
      .select("id,title,updated_at")
      .eq("user_id", userId)
      .eq("kind", "note")
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("categories")
      .select("id,name,kind")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("kind")
      .limit(100),
    // This month only. The agent has monthlyMoneySummary for anything older.
    supabase
      .from("transactions")
      .select("kind,amount_cents")
      .eq("user_id", userId)
      .gte("occurred_on", monthFrom)
      .limit(500),
    supabase
      .from("wallet_net")
      .select("net_cents")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const currency = profile?.currency ?? "USD";
  const totalCents = (kind: string) =>
    (money.data ?? [])
      .filter((row) => row.kind === kind)
      .reduce((sum, row) => sum + row.amount_cents, 0);

  const lines = [
    `User: ${profile?.display_name ?? "unknown"} (id ${userId})`,
    `Timezone: ${timezone}. Today is ${day}.`,
    `Currently viewing: ${PAGE_NAMES[pathname] ?? pathname}`,
    "",
    `Today's tasks (${tasks.data?.length ?? 0}):`,
    ...(tasks.data ?? []).map(
      (task) =>
        `  - [${task.status}] ${task.title}${task.planned_minutes ? ` (${task.planned_minutes}m)` : ""
        } · id ${task.id}`,
    ),
    "",
    `Today's events (${events.data?.length ?? 0}):`,
    ...(events.data ?? []).map(
      (event) => `  - ${event.title} ${event.starts_at} → ${event.ends_at}`,
    ),
    "",
    `Recent notes (${notes.data?.length ?? 0}):`,
    ...(notes.data ?? []).map(
      (note) => `  - ${note.title || "Untitled"} · id ${note.id}`,
    ),
    "",
    `Currency: ${currency}. Amounts are given in major units.`,
    `Wallet balance: ${(((profile?.opening_balance_cents ?? 0) + (walletNet.data?.net_cents ?? 0)) / 100).toFixed(2)}.`,
    `This month so far: income ${(totalCents("income") / 100).toFixed(2)}, expenses ${(totalCents("expense") / 100).toFixed(2)}.`,
    `Money categories (${categories.data?.length ?? 0}):`,
    ...(categories.data ?? []).map(
      (category) => `  - [${category.kind}] ${category.name} · id ${category.id}`,
    ),
  ];

  return { text: lines.join("\n"), day, timezone };
}
