# Reminders

A reminder is not its own noun: it is `remind_at` on a task or an event. So it
shows up in Tasks, in the calendar, and can be completed — for free.

```
tasks.remind_at    timestamptz  when to fire
tasks.reminded_at  timestamptz  claim stamp; null means "not sent yet"
events.remind_at / events.reminded_at   same
push_subscriptions                      one row per browser, per device
```

## How one fires

1. Something sets `remind_at` (the task dialog, or the assistant's
   `createTask` / `setTaskReminder`).
2. A caller POSTs `/api/reminders/dispatch`.
3. The route **claims** due rows with a single `UPDATE … SET reminded_at = now()
   WHERE remind_at <= now() AND reminded_at IS NULL … RETURNING *`. Two runs
   overlapping cannot both take the same row — whoever's UPDATE lands first
   gets it back, the other gets nothing.
4. Each claimed row is pushed to every device the owner has registered.
   A push service answering 404/410 means that subscription is dead, so it is
   deleted rather than retried forever.

Moving a reminder clears `reminded_at`: a new time is a new alarm, and a stale
claim stamp would silently swallow it.

## Who calls the dispatcher

**An open tab** (`modules/reminders/components/reminder-sync.tsx`) — once a
minute, only while visible, only its own user. This is what makes reminders
work in development, and it needs no configuration.

**The scheduler**, for reminders that must arrive when the app is closed. This
needs the app deployed at a public URL, then, once:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'dispatch-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-DOMAIN/api/reminders/dispatch',
    headers := '{"authorization": "Bearer YOUR_REMINDER_DISPATCH_SECRET"}'::jsonb
  );
  $$
);
```

The secret is `REMINDER_DISPATCH_SECRET` from `.env.local`. That branch runs as
service role — it has no session and must see every user's rows — which is
exactly why it is gated on the secret.

To stop it: `select cron.unschedule('dispatch-reminders');`

## Environment

| Variable | Where | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | already set | the browser subscribes with it |
| `VAPID_PRIVATE_KEY` | already set | signs each push; never leaves the server |
| `VAPID_SUBJECT` | already set | contact address the push services require |
| `REMINDER_DISPATCH_SECRET` | already set | authorises the scheduler |
| `SUPABASE_SERVICE_ROLE_KEY` | **you must add** | only the scheduled path uses it |

Keys were generated locally into `.env.local`, which is gitignored.
`.env.example` carries placeholders and the command to generate a fresh pair.

## Caveats worth knowing

- **iPhone**: web push only works for an installed PWA. Add Moly to the Home
  Screen (Share → Add to Home Screen), open it from there, then turn reminders
  on in Settings. In a Safari tab, nothing will ever fire.
- Permission is **per device**. Settings → Reminders has to be turned on
  wherever you want them, and "Send a test" proves the whole path end to end.
- A reminder on a task that is already `done` is skipped, not sent.
- Delivery is best effort: a device that is off receives the push when it comes
  back, and the push service decides how long to hold it.
