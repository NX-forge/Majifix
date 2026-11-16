import Link from "next/link";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { markAllNotificationsReadAction, markNotificationReadAction, saveNotificationPreferencesAction } from "@/lib/notifications/actions";

export const metadata = { title: "Notifications" };

const preferenceItems = [
  ["inAppEnabled", "In-app notifications"],
  ["emailEnabled", "Email notifications"],
  ["faultUpdates", "Fault report updates"],
  ["assignments", "Technician assignments and responses"],
  ["repairUpdates", "Repair progress updates"],
  ["costDecisions", "Repair cost decisions"],
  ["delayUpdates", "Repair delays"],
  ["restoration", "Restoration confirmation"],
] as const;

export default async function NotificationsPage() {
  const { user } = await requireUser();
  const [notifications, unreadCount, preferences] = await Promise.all([
    prisma.notification.findMany({ where: { userId: user.id, inAppVisible: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.notification.count({ where: { userId: user.id, readAt: null, inAppVisible: true } }),
    prisma.notificationPreference.findUnique({ where: { userId: user.id } }),
  ]);

  return <div className="notification-page">
    <div className="page-head"><div><p className="eyebrow">YOUR UPDATES</p><h1>Notifications</h1><p className="muted">{unreadCount} unread · Showing your latest 100 notifications</p></div>{unreadCount > 0 && <form action={markAllNotificationsReadAction}><button className="btn btn-secondary" type="submit">Mark all as read</button></form>}</div>
    <section className="card">
      <h2>Recent activity</h2>
      {notifications.length === 0 ? <p className="muted">You do not have any notifications yet. Updates about your reports and repair work will appear here.</p> : <div className="timeline">{notifications.map((notification) => <article key={notification.id} className="timeline-item" style={{ alignItems: "flex-start", opacity: notification.readAt ? 0.72 : 1 }}>
        <div style={{ flex: 1 }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><strong>{notification.title}</strong>{!notification.readAt && <span className="pill">Unread</span>}</div><p className="muted" style={{ margin: "6px 0" }}>{notification.message}</p><small className="muted">{notification.createdAt.toLocaleString("en-KE")}</small><div style={{ display: "flex", gap: 12, marginTop: 8 }}>{notification.href && <Link href={notification.href}>Open related record</Link>}{!notification.readAt && <form action={markNotificationReadAction}><input type="hidden" name="notificationId" value={notification.id}/><button className="btn btn-secondary" type="submit">Mark as read</button></form>}</div></div>
      </article>)}</div>}
    </section>
    <section className="card"><h2>Notification preferences</h2><p className="muted">Choose which updates you receive. In-app and email channels can be controlled separately.</p><form action={saveNotificationPreferencesAction} className="form-grid">{preferenceItems.map(([name, label]) => { const defaultValue = name === "inAppEnabled" || name === "emailEnabled" || name === "faultUpdates" || name === "assignments" || name === "repairUpdates" || name === "costDecisions" || name === "delayUpdates" || name === "restoration"; const checked = preferences ? Boolean(preferences[name]) : defaultValue; return <label key={name} className="checkbox"><input type="checkbox" name={name} defaultChecked={checked}/><span>{label}</span></label>; })}<div><button className="btn btn-primary" type="submit">Save preferences</button></div></form></section>
  </div>;
}
