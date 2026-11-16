import Link from "next/link";
import { PriorityLevel, UserRole } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-guard";
import { buildFaultReportScope, buildWaterPointScope } from "@/lib/analytics/scope";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const { user } = await requireUser();

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
    <div className="page-head">
      <div><div className="eyebrow">Overview</div><h1>Good to see you, {user.name.split(" ")[0]}.</h1><p className="muted" style={{ margin: 0 }}>Here is the current water-point repair picture.</p></div>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        {user.role === UserRole.TECHNICIAN ? <Link href="/technician/jobs" className="btn btn-primary">Open my repair jobs</Link> : <Link href="/faults/new" className="btn btn-primary">Report a fault</Link>}
        {canManage && <Link href="/water-points/new" className="btn btn-secondary">Add water point</Link>}
      </div>
    </div>
    <div className="grid stats">
      {[{ label: "Water points", value: waterPoints, foot: "In your access scope" }, { label: "Open reports", value: open, foot: "Awaiting restoration or closure" }, { label: "Critical reports", value: critical, foot: "Require urgent assessment" }, { label: "Restored reports", value: restored, foot: `Of ${total} reports in your access scope` }].map((stat) => <div className="card" key={stat.label}><div className="stat-label">{stat.label}</div><div className="stat-value">{stat.value}</div><div className="stat-foot">{stat.foot}</div></div>)}
    </div>
    <div className="split">
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}><h2 style={{ margin: 0 }}>Recent fault reports</h2><Link href="/faults" style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700 }}>View all →</Link></div>
        {faults.length === 0 ? <div className="empty">No fault reports yet. Submit the first report to begin tracking repairs.</div> : <div className="table-wrap"><table><thead><tr><th>Reference</th><th>Water point</th><th>Priority</th><th>Status</th></tr></thead><tbody>{faults.map((fault) => <tr key={fault.id}><td><Link href={`/faults/${fault.id}`} style={{ fontWeight: 800, color: "var(--blue)" }}>{fault.reference}</Link><div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{fault.createdAt.toLocaleDateString("en-KE")}</div></td><td>{fault.waterPoint.name}<div className="muted" style={{ fontSize: 11 }}>{fault.waterPoint.county}</div></td><td><span className={`pill pill-${fault.priority.toLowerCase()}`}>{fault.priority}</span></td><td><span className="pill">{fault.status.replaceAll("_", " ")}</span></td></tr>)}</tbody></table></div>}
      </section>
      <aside className="card">
        <h2>Team and service</h2>
        {technicians !== null && <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #edf2f7" }}><span className="muted" style={{ fontSize: 13 }}>Active technicians</span><strong>{technicians}</strong></div>}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #edf2f7" }}><span className="muted" style={{ fontSize: 13 }}>Your role</span><strong style={{ fontSize: 12 }}>{user.role}</strong></div>
        <div style={{ marginTop: 20 }}><div className="eyebrow">Workflow rule</div><p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>A repair is not marked restored until a community member or authorised operator confirms that water is flowing again.</p></div>
        <div className="notice" style={{ marginTop: 18, marginBottom: 0 }}>Use demo records only for testing. Do not enter real personal or sensitive information in a public demo.</div>
      </aside>
    </div>
  </>;
}
