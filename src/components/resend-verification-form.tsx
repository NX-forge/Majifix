"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ResendVerificationForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const callbackURL = new URL("/account/pending?verified=1", window.location.origin).toString();
      const result = await authClient.sendVerificationEmail({ email, callbackURL });
      if (result.error) {
        setError("We could not process the request. Wait a moment and try again.");
        return;
      }
      setMessage("If the account needs verification, a new verification email will be sent.");
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form action={submit} className="card" style={{ maxWidth: 460, margin: "18px auto 0" }}>
    <div className="field">
      <label htmlFor="verification-email">Email address</label>
      <input id="verification-email" name="email" type="email" required maxLength={254} autoComplete="email" />
    </div>
    {message && <div className="notice" role="status" style={{ marginTop: 14, marginBottom: 0 }}>{message}</div>}
    {error && <div className="notice error" role="alert" style={{ marginTop: 14, marginBottom: 0 }}>{error}</div>}
    <button className="btn btn-primary" disabled={busy} style={{ width: "100%", marginTop: 16 }}>{busy ? "Sending…" : "Resend verification email"}</button>
  </form>;
}
