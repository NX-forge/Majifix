import Link from "next/link";
import { Droplet } from "lucide-react";
import { getSession } from "@/lib/auth-guard";
import { SignOutButton } from "@/components/sign-out-button";
import { prisma } from "@/lib/prisma";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const signedInUser = session?.user ? session.user as typeof session.user & { id: string } : null;
  const unreadNotifications = signedInUser ? await prisma.notification.count({ where: { userId: signedInUser.id, readAt: null, inAppVisible: true } }) : 0;
  return <><header className="topbar"><div className="container" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:20}}><Link href="/" className="brand"><span className="brand-mark"><Droplet size={21}/></span><span>MajiFix</span></Link><nav className="nav"><Link href="/dashboard">Dashboard</Link><Link href="/water-points" className="optional">Water points</Link><Link href="/faults">Fault reports</Link>{session?.user && (session.user as typeof session.user & { role?: string }).role === "TECHNICIAN" && <Link href="/technician/jobs" className="optional">My jobs</Link>}<Link href="/analytics" className="optional">Analytics</Link>{session?.user && <Link href="/notifications">Notifications{unreadNotifications > 0 ? ` (${unreadNotifications > 99 ? "99+" : unreadNotifications})` : ""}</Link>}{session?.user ? <><Link href="/team" className="optional">Team</Link><Link href="/account/security" className="optional">Security</Link><span className="optional" style={{color:"#829ab1"}}>{session.user.name}</span><SignOutButton/></> : <><Link href="/login">Log in</Link><Link href="/register" className="btn btn-primary" style={{padding:"8px 12px"}}>Get started</Link></>}</nav></div></header><main className="shell"><div className="container">{children}</div></main><footer style={{ background: "#fff", borderTop: "1px solid var(--line)", padding: "18px 0" }}><div className="container" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "var(--muted)", fontSize: 12 }}><span>MajiFix · Water-point repair coordination</span><Link href="/privacy" style={{ color: "var(--blue-dark)", fontWeight: 700 }}>Privacy and data handling</Link></div></footer></>;
}
