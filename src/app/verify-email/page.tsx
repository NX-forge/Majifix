import Link from "next/link";
import { ResendVerificationForm } from "@/components/resend-verification-form";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const query = await searchParams;
  return <div className="auth-wrap">
    <section style={{ width: "min(520px, 100%)", textAlign: "center" }}>
      <div className="eyebrow">Email verification</div>
      <h1>Check your inbox</h1>
      <p className="muted" style={{ lineHeight: 1.7 }}>We have processed your registration. Follow the verification link sent to your email address. After verifying your email, an administrator must activate your account before you can sign in.</p>
      {query.sent && <div className="notice">Registration received. Check your inbox and spam folder for the verification email.</div>}
      {query.error && <div className="notice error">The verification link could not be used. Request a fresh link below.</div>}
      <ResendVerificationForm />
      <p style={{ marginTop: 18, fontSize: 13 }}><Link href="/login" style={{ color: "var(--blue)", fontWeight: 700 }}>Return to sign in</Link></p>
    </section>
  </div>;
}
