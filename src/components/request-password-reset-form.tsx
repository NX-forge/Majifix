"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function RequestPasswordResetForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const redirectTo = new URL("/reset-password", window.location.origin).toString();
      const result = await authClient.requestPasswordReset({ email, redirectTo });
      if (result.error) {
        setError("We could not process the request. Please try again later.");
        return;
      }
      setMessage("If an account exists for that email address, a password reset link will be sent.");
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form action={submit} className="card auth-card">
    <div className="eyebrow">Account recovery</div>
    <h1 style={{ fontSize: 28 }}>Reset your password</h1>
    <p className="muted" style={{ fontSize: 14 }}>Enter the email address linked to your MajiFix account.</p>
    {message && <div className="notice" role="status">{message}</div>}
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="field" style={{ margin: "20px 0" }}>
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" />
    </div>
    <button className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>{busy ? "Sending…" : "Send reset link"}</button>
    <p style={{ textAlign: "center", margin: "18px 0 0", fontSize: 13 }}><Link href="/login" style={{ color: "var(--blue)", fontWeight: 700 }}>Return to sign in</Link></p>
  </form>;
}
