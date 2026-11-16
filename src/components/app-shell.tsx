import Link from "next/link";
import { Droplet } from "lucide-react";
import { getSession } from "@/lib/auth-guard";
import { SignOutButton } from "@/components/sign-out-button";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return <><header className="topbar"><div className="container" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:20}}><Link href="/" className="brand"><span className="brand-mark"><Droplet size={21}/></span><span>MajiFix</span></Link><nav className="nav"><Link href="/dashboard">Dashboard</Link><Link href="/water-points" className="optional">Water points</Link><Link href="/faults">Fault reports</Link><Link href="/analytics" className="optional">Analytics</Link>{session?.user ? <><Link href="/team" className="optional">Team</Link><span className="optional" style={{color:"#829ab1"}}>{session.user.name}</span><SignOutButton/></> : <><Link href="/login">Log in</Link><Link href="/register" className="btn btn-primary" style={{padding:"8px 12px"}}>Get started</Link></>}</nav></div></header><main className="shell"><div className="container">{children}</div></main></>;
}
