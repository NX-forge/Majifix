import Link from "next/link";

export default function NotFoundPage() {
  return <div className="card" style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
    <div className="eyebrow">404 · Not found</div>
    <h1 style={{ fontSize: 28 }}>We could not find that record.</h1>
    <p className="muted">The record may not exist, or your account may not have permission to view it.</p>
    <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 12 }}>Return to dashboard</Link>
  </div>;
}
