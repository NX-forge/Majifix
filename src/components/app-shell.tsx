import Link from "next/link";
import { Droplet } from "lucide-react";
import { getSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { AppNavigation } from "@/components/app-navigation";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const signedInUser = session?.user ? session.user as typeof session.user & { id: string; role?: string } : null;
  const unreadNotifications = signedInUser
    ? await prisma.notification.count({ where: { userId: signedInUser.id, readAt: null, inAppVisible: true } })
    : 0;

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <div className="topbar-inner container">
          <Link href={signedInUser ? "/dashboard" : "/"} className="brand" aria-label="MajiFix home">
            <span className="brand-mark"><Droplet size={20} strokeWidth={2.5} /></span>
            <span className="brand-name">MajiFix</span>
            <span className="brand-caption">WATER SERVICE, RESTORED</span>
          </Link>
          <AppNavigation role={signedInUser?.role ?? null} userName={signedInUser?.name ?? null} unreadNotifications={unreadNotifications} />
        </div>
      </header>
      <main id="main-content" className="shell" tabIndex={-1}>
        <div className="container">{children}</div>
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <div><strong>MajiFix</strong><span>Community water-point repair coordination</span></div>
          <Link href="/privacy">Privacy and data handling</Link>
          <span className="footer-region">Built for water services in Kenya</span>
        </div>
      </footer>
    </>
  );
}
