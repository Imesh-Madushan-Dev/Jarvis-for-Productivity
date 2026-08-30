import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-actions";

import { PanelHeading, Row, RowGroup } from "../rows";

export function AccountSection({ email }: { email: string }) {
  return (
    <div>
      <PanelHeading title="Account" description="Sign-in details and session." />

      <RowGroup>
        <Row
          label="Email"
          description="The address you sign in with. Changing it isn't supported yet."
        >
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </Row>

        <Row label="Session" description="Signs you out of this browser.">
          {/* Action, not a link: a GET route would let any prefetcher sign the
              user out. */}
          <form action={signOut}>
            <Button type="submit" variant="outline" className="t-press">
              Sign out
            </Button>
          </form>
        </Row>
      </RowGroup>
    </div>
  );
}
