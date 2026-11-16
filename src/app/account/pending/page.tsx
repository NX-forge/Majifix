import Link from "next/link";

export default async function PendingAccountPage({ searchParams }: { searchParams: Promise<{ verified?: string }> }) {
  const query = await searchParams;
  return <div className="auth-wrap">
    <section className="card" style={{ width: "min(520px, 100%)" }}>
      <div className="eyebrow">Account approval</div>
      <h1>{query.verified ? "Email verified" : "Account awaiting approval"}</h1>
      <p className="muted" style={{ lineHeight: 1.7 }}>
        {query.verified
          ? "Your email address has been verified. An administrator must activate your account before you can access MajiFix."
          : "Your account is not active yet. Verify your email address, then wait for an administrator to approve access."}
      </p>
      <div className="notice">New accounts start with community access disabled until an administrator reviews and activates them.</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/verify-email" className="btn btn-primary">Verify email</Link>
        <Link href="/login" className="btn btn-secondary">Return to sign in</Link>
      </div>
    </section>
  </div>;
}
