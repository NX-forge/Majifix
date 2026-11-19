import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Droplets, Plus, Waves, Wrench } from "lucide-react";
import { PriorityLevel, UserRole } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-guard";
import { buildFaultReportScope, buildWaterPointScope } from "@/lib/analytics/scope";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await requireUser();
  const query = await searchParams;

  // Keep dashboard aggregates inside the same ownership boundaries as the records.
  const faultScope = buildFaultReportScope(user.role, user.id);
  const pointScope = buildWaterPointScope(user.role, user.id);

  const [faults, waterPoints, total, critical, restored, open, technicians] = await Promise.all([
    prisma.faultReport.findMany({
      where: faultScope,
      include: { waterPoint: true, repairJob: { include: { technician: true } } },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.waterPoint.count({ where: pointScope }),
    prisma.faultReport.count({ where: faultScope }),
    prisma.faultReport.count({ where: { ...faultScope, priority: PriorityLevel.CRITICAL, status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] } } }),
    prisma.faultReport.count({ where: { ...faultScope, status: "RESTORED" } }),
    prisma.faultReport.count({ where: { ...faultScope, status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] } } }),
    user.role === UserRole.ADMIN || user.role === UserRole.OPERATOR
      ? prisma.user.count({ where: { role: UserRole.TECHNICIAN, accountStatus: "ACTIVE" } })
      : Promise.resolve(null),
  ]);

  const canManage = user.role === UserRole.ADMIN || user.role === UserRole.OPERATOR;
  return <>
    {query.error === "rate-limited" && <div className="notice error" role="alert">Too many changes were submitted in a short period. Please wait and try again.</div>}
    {query.error === "forbidden" && <div className="notice error" role="alert">Your account does not have permission to access that resource.</div>}
    <div className="page-head dashboard-heading">
      <div><div className="eyebrow">Your workspace · {user.role.replaceAll("_", " ")}</div><h1>Good to see you, {user.name.split(" ")[0]}.</h1><p className="muted" style={{ margin: 0 }}>Here is the latest picture of water-point service and repairs in your access scope.</p></div>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        {user.role === UserRole.TECHNICIAN ? <Link href="/technician/jobs" className="btn btn-primary"><Wrench size={16}/> Open my repair jobs</Link> : <Link href="/faults/new" className="btn btn-primary"><Plus size={16}/> Report a fault</Link>}
        {canManage && <Link href="/water-points/new" className="btn btn-secondary"><Waves size={16}/> Add water point</Link>}
      </div>
    </div>
    <div className="grid stats dashboard-stats">
      {[{ label: "Water points", value: waterPoints, foot: "In your access scope", icon: Droplets, tone: "teal" }, { label: "Open reports", value: open, foot: "Awaiting restoration or closure", icon: ClipboardList, tone: "blue" }, { label: "Critical reports", value: critical, foot: "Require urgent assessment", icon: AlertTriangle, tone: "red" }, { label: "Restored reports", value: restored, foot: `Of ${total} reports in your access scope`, icon: CheckCircle2, tone: "green" }].map((stat) => { const Icon = stat.icon; return <div className="card dashboard-stat" key={stat.label}><div className="dashboard-stat-top"><span className="stat-label">{stat.label}</span><span className={`stat-icon stat-icon-${stat.tone}`}><Icon size={17}/></span></div><div className="stat-value">{stat.value.toLocaleString("en-KE")}</div><div className="stat-foot">{stat.foot}</div></div>; })}
    </div>
    <div className="split">
      <section className="card dashboard-recent">
        <div className="section-heading"><div><div className="eyebrow">Latest activity</div><h2 style={{ margin: "5px 0 0" }}>Recent fault reports</h2></div><Link href="/faults" className="text-link">View all <ArrowRight size={14}/></Link></div>
        {faults.length === 0 ? <div className="empty">No fault reports yet. Submit the first report to begin tracking repairs.</div> : <div className="table-wrap"><table><thead><tr><th>Reference</th><th>Water point</th><th>Priority</th><th>Status</th></tr></thead><tbody>{faults.map((fault) => <tr key={fault.id}><td><Link href={`/faults/${fault.id}`} style={{ fontWeight: 800, color: "var(--blue)" }}>{fault.reference}</Link><div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{fault.createdAt.toLocaleDateString("en-KE")}</div></td><td>{fault.waterPoint.name}<div className="muted" style={{ fontSize: 11 }}>{fault.waterPoint.county}</div></td><td><span className={`pill pill-${fault.priority.toLowerCase()}`}>{fault.priority}</span></td><td><span className="pill">{fault.status.replaceAll("_", " ")}</span></td></tr>)}</tbody></table></div>}
      </section>
      <aside className="card dashboard-aside">
        <div className="eyebrow">At a glance</div><h2 style={{ marginTop: 5 }}>Team and service</h2>
        {technicians !== null && <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #edf2f7" }}><span className="muted" style={{ fontSize: 13 }}>Active technicians</span><strong>{technicians}</strong></div>}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #edf2f7" }}><span className="muted" style={{ fontSize: 13 }}>Your role</span><strong style={{ fontSize: 12 }}>{user.role}</strong></div>
        <div className="workflow-note"><Droplets size={18}/><p>A repair is not marked restored until a community member or authorised operator confirms that water is flowing again.</p></div>
      </aside>
    </div>
  </>;
}
