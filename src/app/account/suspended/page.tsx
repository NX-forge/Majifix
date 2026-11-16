import Link from "next/link";

export default function SuspendedAccountPage() {
  return <div className="auth-wrap">
    <section className="card" style={{ width: "min(520px, 100%)" }}>
      <div className="eyebrow">Account access</div>
      <h1>Account suspended</h1>
      <p className="muted" style={{ lineHeight: 1.7 }}>Access to this MajiFix account has been suspended by an administrator. Contact the platform administrator if you believe this is a mistake.</p>
      <Link href="/login" className="btn btn-secondary">Return to sign in</Link>
    </section>
  </div>;
}
