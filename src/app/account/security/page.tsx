import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "@/components/change-password-form";
import { RevokeSessionButton } from "@/components/revoke-session-button";

const errorMessages: Record<string, string> = {
  "invalid-session": "Select a valid session.",
  "session-not-found": "That session no longer exists.",
  "current-session": "Use the sign-out button to end your current session.",
};

function describeDevice(userAgent: string | null) {
  if (!userAgent) return "Unknown device or browser";
  if (/Android/i.test(userAgent)) return "Android device";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "Apple mobile device";
  if (/Windows/i.test(userAgent)) return "Windows device";
  if (/Macintosh|Mac OS/i.test(userAgent)) return "Mac device";
  if (/Linux/i.test(userAgent)) return "Linux device";
  return "Other device";
}

export default async function AccountSecurityPage({ searchParams }: { searchParams: Promise<{ error?: string; revoked?: string }> }) {
  const { user, session: currentSession } = await requireUser();
  const query = await searchParams;
  const sessions = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    select: { id: true, updatedAt: true, expiresAt: true, userAgent: true },
    orderBy: { updatedAt: "desc" },
  });

  return <>
    <div className="page-head">
      <div>
        <div className="eyebrow">Account</div>
        <h1>Security settings</h1>
        <p className="muted" style={{ margin: 0 }}>Manage your password and active sign-in sessions.</p>
      </div>
    </div>
    {query.error && <div className="notice error">{errorMessages[query.error] ?? "The requested session action could not be completed."}</div>}
    {query.revoked && <div className="notice">The selected device session has been signed out.</div>}
    <div className="split">
      <ChangePasswordForm />
      <section className="card">
        <h2>Active sessions</h2>
        <p className="muted" style={{ fontSize: 13 }}>Sessions expire 12 hours after their last refresh. Active sessions refresh hourly. Account access changes revoke all sessions.</p>
        {sessions.length === 0 ? <div className="empty">No active sessions found.</div> : sessions.map((session) => {
          const isCurrent = session.id === currentSession.id;
          return <div key={session.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: "1px solid #edf2f7" }}>
            <div>
              <strong style={{ fontSize: 13 }}>{describeDevice(session.userAgent)}</strong>
              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Last active {session.updatedAt.toLocaleString("en-KE")} · Expires {session.expiresAt.toLocaleString("en-KE")}</div>
              {isCurrent && <span className="pill pill-restored" style={{ marginTop: 6 }}>Current session</span>}
            </div>
            {!isCurrent && <RevokeSessionButton sessionId={session.id} />}
          </div>;
        })}
      </section>
    </div>
  </>;
}
