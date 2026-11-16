"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token, invalidLink = false }: { token?: string; invalidLink?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(formData: FormData) {
    setError("");
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");
    if (!token) {
      setError("This password reset link is missing or invalid. Request a new one.");
      return;
    }
    if (password.length < 10 || password.length > 128) {
      setError("Your password must contain between 10 and 128 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setError(result.error.message ?? "The reset link is invalid or has expired. Request a new one.");
        return;
      }
      setComplete(true);
      window.setTimeout(() => router.push("/login?passwordReset=1"), 1800);
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form action={submit} className="card auth-card">
    <div className="eyebrow">Account recovery</div>
    <h1 style={{ fontSize: 28 }}>Choose a new password</h1>
    {complete ? <div className="notice" role="status">Your password has been updated. Redirecting you to sign in…</div> : <>
      {(!token || invalidLink) && <div className="notice error">This reset link is missing, invalid or expired. Request a new password reset link.</div>}
      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="field" style={{ margin: "18px 0 14px" }}>
        <label htmlFor="password">New password</label>
        <input id="password" name="password" type="password" minLength={10} maxLength={128} required autoComplete="new-password" />
      </div>
      <div className="field" style={{ marginBottom: 18 }}>
        <label htmlFor="confirmation">Confirm new password</label>
        <input id="confirmation" name="confirmation" type="password" minLength={10} maxLength={128} required autoComplete="new-password" />
      </div>
      <button className="btn btn-primary" disabled={busy || !token || invalidLink} style={{ width: "100%" }}>{busy ? "Updating…" : "Update password"}</button>
    </>}
    <p style={{ textAlign: "center", margin: "18px 0 0", fontSize: 13 }}><Link href="/login" style={{ color: "var(--blue)", fontWeight: 700 }}>Return to sign in</Link></p>
  </form>;
}
