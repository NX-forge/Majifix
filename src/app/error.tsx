"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="card" style={{ maxWidth: 560, margin: "60px auto" }}>
    <div className="eyebrow">Something went wrong</div>
    <h1 style={{ fontSize: 28 }}>MajiFix could not complete that request.</h1>
    <p className="muted">Try again. If the problem continues, contact the platform administrator and share the error reference.</p>
    {error.digest && <p className="muted" style={{ fontSize: 12 }}>Reference: {error.digest}</p>}
    <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
  </div>;
}
