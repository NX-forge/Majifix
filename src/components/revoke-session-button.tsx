"use client";

import { useState } from "react";
import { revokeOwnSessionAction } from "@/lib/actions";

export function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const [busy, setBusy] = useState(false);

  return <form action={async (formData) => {
    setBusy(true);
    try {
      await revokeOwnSessionAction(formData);
    } finally {
      setBusy(false);
    }
  }}>
    <input type="hidden" name="sessionId" value={sessionId} />
    <button className="btn btn-danger" disabled={busy}>{busy ? "Revoking…" : "Sign out device"}</button>
  </form>;
}
