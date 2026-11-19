"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Bell, ChevronDown, ClipboardList, LayoutDashboard, Menu, Shield, Users, Waves, Wrench, X } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

type NavigationItem = { href: string; label: string; icon: typeof LayoutDashboard; badge?: number };

export function AppNavigation({
  role,
  userName,
  unreadNotifications,
}: {
  role: string | null;
  userName: string | null;
  unreadNotifications: number;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const signedIn = Boolean(role);
  const managementRole = role === "ADMIN" || role === "OPERATOR";
  const items: NavigationItem[] = signedIn
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/water-points", label: "Water points", icon: Waves },
        { href: "/faults", label: "Fault reports", icon: ClipboardList },
        ...(role === "TECHNICIAN" ? [{ href: "/technician/jobs", label: "My repair jobs", icon: Wrench }] : []),
        ...(managementRole ? [{ href: "/team", label: "Team", icon: Users }] : []),
        ...(managementRole ? [{ href: "/analytics", label: "Analytics", icon: BarChart3 }] : []),
        { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadNotifications },
      ]
    : [];

  function closeMenu() {
    setMobileOpen(false);
  }

  return (
    <>
      <nav className="nav-desktop" aria-label="Main navigation">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
              <Icon size={16} strokeWidth={2} />
              <span>{item.label}</span>
              {item.badge ? <span className="nav-count">{item.badge > 99 ? "99+" : item.badge}</span> : null}
            </Link>
          );
        })}
        {signedIn ? (
          <div className="nav-account">
            <Link href="/account/security" className={`nav-link nav-user${pathname.startsWith("/account") ? " is-active" : ""}`}>
              <Shield size={16} /> <span>{userName ?? "Account"}</span>
            </Link>
            <SignOutButton />
          </div>
        ) : (
          <div className="nav-account">
            <Link href="/login" className="nav-link">Log in</Link>
            <Link href="/register" className="btn btn-primary nav-cta">Get started</Link>
          </div>
        )}
      </nav>

      <button
        type="button"
        className="mobile-menu-trigger"
        aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={mobileOpen}
        aria-controls="mobile-navigation"
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X size={21} /> : <Menu size={21} />}
      </button>

      {mobileOpen ? (
        <>
          <button className="mobile-nav-backdrop" type="button" aria-label="Close navigation menu" onClick={closeMenu} />
          <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">
            <div className="mobile-nav-heading">
              <span>Workspace</span>
              <span className="mobile-role">{role?.replaceAll("_", " ") ?? "Guest"}</span>
            </div>
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={closeMenu} className={`mobile-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
                  <Icon size={18} /> <span>{item.label}</span>
                  {item.badge ? <span className="nav-count">{item.badge > 99 ? "99+" : item.badge}</span> : null}
                  <ChevronDown className="mobile-nav-chevron" size={15} />
                </Link>
              );
            })}
            {signedIn ? (
              <>
                <Link href="/account/security" onClick={closeMenu} className="mobile-nav-link"><Shield size={18} /><span>Account security</span></Link>
                <div className="mobile-signout"><SignOutButton /></div>
              </>
            ) : (
              <div className="mobile-auth-actions"><Link href="/login" className="btn btn-secondary" onClick={closeMenu}>Log in</Link><Link href="/register" className="btn btn-primary" onClick={closeMenu}>Get started</Link></div>
            )}
          </nav>
        </>
      ) : null}
    </>
  );
}
