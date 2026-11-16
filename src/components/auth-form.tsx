"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const registering = mode === "register";

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");

    try {
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const password = String(formData.get("password") ?? "");
      const callbackURL = new URL("/account/pending?verified=1", window.location.origin).toString();

      const result = registering
        ? await authClient.signUp.email({
            name: String(formData.get("name") ?? "").trim(),
            email,
            password,
            phone: String(formData.get("phone") ?? "").trim() || undefined,
            callbackURL,
          })
        : await authClient.signIn.email({ email, password, rememberMe: true });

      if (result.error) {
        const message = result.error.message ?? "Unable to authenticate. Check your details and try again.";
        setError(result.error.status === 403
          ? "Your email may need verification, or your account may still be awaiting administrator approval or may be suspended."
          : message);
        return;
      }

      if (registering) {
        router.push("/verify-email?sent=1");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form action={submit} className="card auth-card">
    <div className="eyebrow">MajiFix access</div>
    <h1 style={{ fontSize: 28 }}>{registering ? "Create your account" : "Welcome back"}</h1>
    <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>
      {registering ? "Create an account to participate in your community's water-point repair workflow." : "Sign in to manage water-point repairs."}
    </p>
    {error && <div className="notice error" role="alert">{error}</div>}
    {registering && <div className="field" style={{ marginBottom: 14 }}>
      <label htmlFor="name">Full name</label>
      <input id="name" name="name" required minLength={2} maxLength={100} autoComplete="name" />
    </div>}
    {registering && <div className="field" style={{ marginBottom: 14 }}>
      <label htmlFor="phone">Phone number (optional)</label>
      <input id="phone" name="phone" autoComplete="tel" maxLength={24} placeholder="07XX XXX XXX" />
    </div>}
    <div className="field" style={{ marginBottom: 14 }}>
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" />
    </div>
    <div className="field" style={{ marginBottom: 18 }}>
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" required minLength={registering ? 10 : 1} maxLength={128} autoComplete={registering ? "new-password" : "current-password"} />
      {registering && <small className="muted">Use at least 10 characters.</small>}
    </div>
    <button className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>
      {busy ? "Please wait…" : registering ? "Create account" : "Sign in"}
    </button>
    {!registering && <p style={{ textAlign: "right", margin: "12px 0 0", fontSize: 13 }}><Link href="/forgot-password" style={{ color: "var(--blue)", fontWeight: 700 }}>Forgot password?</Link></p>}
    <p className="muted" style={{ fontSize: 13, marginTop: 18, textAlign: "center" }}>
      {registering ? "Already registered? " : "New to MajiFix? "}
      <Link href={registering ? "/login" : "/register"} style={{ color: "var(--blue)", fontWeight: 700 }}>
        {registering ? "Log in" : "Create an account"}
      </Link>
    </p>
  </form>;
}
