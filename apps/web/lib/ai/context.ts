import { todayInZone, zonedDayRange } from "@/lib/day";
import { createClient } from "@/lib/supabase/server";

const PAGE_NAMES: Record<string, string> = {
  "/": "Overview dashboard",
  "/notes": "Notes",
  "/calendar": "Calendar",
  "/tasks": "Tasks",
  "/finance": "Money tracker",
  "/journal": "Journal",
  "/settings": "Settings",
};

/**
 * What the assistant knows before it does anything: who the user is, what day
 * it is where they are, and what is on today's plan.
 *
 * This block is prepended to *every* message, so it is kept deliberately
 * small — today only, ids but no bodies, counts instead of contents. Anything
 * older or wordier is reached with the `recall` tool, which is one round trip
 * when it is actually needed rather than a tax on every request.
 *
 * Queried directly rather than through a module's cached queries: those carry
 * `use cache: private`, a render-time directive with no meaning in a route
 * handler.
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

  const [tasks, events, categories, money, walletNet, journal] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id,title,status,remind_at")
        .eq("user_id", userId)
        .eq("planned_date", day)
        .order("position")
        .limit(25),
      supabase
        .from("events")
        .select("id,title,starts_at")
        .eq("user_id", userId)
        .gte("starts_at", start)
        .lt("starts_at", end)
        .order("starts_at")
        .limit(15),
      // Ids are needed to file a transaction, so these are the one list that
      // must be complete rather than sampled.
      supabase
        .from("categories")
        .select("id,name,kind")
        .eq("user_id", userId)
        .eq("archived", false)
        .order("kind")
        .limit(60),
      // Head only: the count and the sum, never the rows.
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
      // Just the last day written. Its text is not included — `recall` fetches
      // what is relevant to the actual question instead of guessing.
      supabase
        .from("journal_entries")
        .select("day")
        .eq("user_id", userId)
        .order("day", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const currency = profile?.currency ?? "USD";
  const rows = money.data ?? [];
  const total = (kind: string) =>
    (
      rows
        .filter((row) => row.kind === kind)
        .reduce((sum, row) => sum + row.amount_cents, 0) / 100
    ).toFixed(2);

  const balance =
    ((profile?.opening_balance_cents ?? 0) + (walletNet.data?.net_cents ?? 0)) /
    100;

  const lines = [
    `User: ${profile?.display_name ?? "unknown"} (id ${userId})`,
    `Timezone: ${timezone}. Today is ${day}. Currency: ${currency}.`,
    `Currently viewing: ${PAGE_NAMES[pathname] ?? pathname}`,
    "",
    `Today's tasks (${tasks.data?.length ?? 0}):`,
    ...(tasks.data ?? []).map(
      (task) =>
        `  [${task.status}] ${task.title}${
          task.remind_at ? ` · reminder ${task.remind_at}` : ""
        } · ${task.id}`,
    ),
    "",
    `Today's events (${events.data?.length ?? 0}):`,
    ...(events.data ?? []).map(
      (event) => `  ${event.starts_at} ${event.title}`,
    ),
    "",
    `Money: balance ${balance.toFixed(2)}, this month income ${total(
      "income",
    )} / expenses ${total("expense")}.`,
    `Categories: ${(categories.data ?? [])
      .map((category) => `${category.name} [${category.kind}] ${category.id}`)
      .join("; ")}`,
    "",
    journal.data?.day
      ? `Journal: last written ${journal.data.day}.`
      : "Journal: nothing written yet.",
    "Everything older or wordier — journal entries, notes, past tasks and events — is reached with the recall tool, not from this block.",
  ];

  return { text: lines.join("\n"), day, timezone };
}
