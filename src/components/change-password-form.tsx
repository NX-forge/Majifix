"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ChangePasswordForm() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setError("");
    setMessage("");
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (newPassword.length < 10 || newPassword.length > 128) {
      setError("Your new password must contain between 10 and 128 characters.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("The new passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setError(result.error.message ?? "The password could not be changed.");
        return;
      }
      setMessage("Your password has been changed. Other active sessions have been signed out.");
      (document.querySelector("form[data-password-form]") as HTMLFormElement | null)?.reset();
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form action={submit} data-password-form className="card">
    <h2>Change password</h2>
    <p className="muted" style={{ fontSize: 13 }}>Use your current password to set a new one. Other active sessions will be revoked.</p>
    {error && <div className="notice error" role="alert">{error}</div>}
    {message && <div className="notice" role="status">{message}</div>}
    <div className="form-grid">
      <div className="field full">
        <label htmlFor="currentPassword">Current password</label>
        <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
      </div>
      <div className="field">
        <label htmlFor="newPassword">New password</label>
        <input id="newPassword" name="newPassword" type="password" required minLength={10} maxLength={128} autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="confirmation">Confirm new password</label>
        <input id="confirmation" name="confirmation" type="password" required minLength={10} maxLength={128} autoComplete="new-password" />
      </div>
    </div>
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Updating…" : "Change password"}</button>
    </div>
  </form>;
}
