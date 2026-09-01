"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signOut } from "@/lib/auth-actions";
import { updateProfile } from "@/modules/profile/actions";

import { PanelHeading, Row, RowGroup } from "../rows";

/**
 * Identity lives here, next to the address you sign in with — the name is who
 * you are, not a workspace preference. It saves on its own rather than through
 * a page-wide form, so nothing else has to be valid for a rename to work.
 */
export function AccountSection({
  email,
  displayName: initialName,
}: {
  email: string;
  displayName: string;
}) {
  const [displayName, setDisplayName] = useState(initialName);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = displayName.trim() !== initialName.trim();

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    startTransition(async () => {
      const result = await updateProfile({ displayName: displayName.trim() });
      if (result.ok) setStatus("Saved.");
      else setError(result.error);
    });
  }

  return (
    <div>
      <PanelHeading
        title="Account"
        description="Who you are, and the session you're in."
      />

      <form onSubmit={save}>
        <RowGroup>
          <Row
            label="Name"
            description="Used in the greeting, the sidebar, and by the assistant when it talks to you."
            htmlFor="settings-display-name"
            hint={
              error ? (
                <span role="alert" className="text-destructive">
                  {error}
                </span>
              ) : status ? (
                <span role="status">{status}</span>
              ) : null
            }
          >
            <div className="flex gap-2">
              <Input
                id="settings-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                maxLength={80}
                autoComplete="name"
              />
              <Button
                type="submit"
                variant="outline"
                disabled={pending || !dirty || !displayName.trim()}
                className="t-press shrink-0"
              >
                Save
              </Button>
            </div>
          </Row>

          <Row
            label="Email"
            description="The address you sign in with. Changing it isn't supported yet."
          >
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </Row>

          <Row label="Session" description="Signs you out of this browser.">
            {/* Action, not a link: a GET route would let any prefetcher sign the
                user out. */}
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void signOut()}
                className="t-press"
              >
                Sign out
              </Button>
            </div>
          </Row>
        </RowGroup>
      </form>
    </div>
  );
}
