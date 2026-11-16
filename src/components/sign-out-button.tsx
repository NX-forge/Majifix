"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <button className="btn btn-secondary" style={{ padding: "7px 10px" }} onClick={signOut} disabled={busy}>
    {busy ? "Signing out…" : "Sign out"}
  </button>;
}
