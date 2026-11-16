import Link from "next/link";
import { FaultStatus, PriorityLevel, UserRole, type Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { durationHours, formatMetricHours, getDateRange, percentage, summarizeDurations } from "@/lib/analytics/metrics";
import { buildFaultReportScope, buildRepairJobScope, buildWaterPointScope } from "@/lib/analytics/scope";

type SearchParams = Promise<{ from?: string; to?: string }>;

const CLOSED_STATUSES: FaultStatus[] = [FaultStatus.RESTORED, FaultStatus.REJECTED, FaultStatus.CANCELLED];
const ACTIVE_STATUSES: FaultStatus[] = [
  FaultStatus.REPORTED, FaultStatus.UNDER_ASSESSMENT, FaultStatus.APPROVED,
  FaultStatus.ASSIGNED, FaultStatus.IN_PROGRESS, FaultStatus.REPAIR_COMPLETED,
  FaultStatus.AWAITING_CONFIRMATION, FaultStatus.REOPENED,
];

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function MetricCard({ label: title, value, detail }: { label: string; value: string | number; detail: string }) {
  return <article className="card"><div className="stat-label">{title}</div><div className="stat-value">{value}</div><div className="stat-foot">{detail}</div></article>;
}

function Distribution({ title, rows, total }: { title: string; rows: Array<{ name: string; count: number; tone?: string }>; total: number }) {
  const maximum = Math.max(1, ...rows.map((row) => row.count));
  return <section className="card">
    <h2>{title}</h2>
    {rows.length === 0 ? <div className="empty">No records in this period.</div> : rows.map((row) => (
      <div key={row.name} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, marginBottom: 7 }}>
          <span>{label(row.name)}</span><strong>{row.count} <span className="muted" style={{ fontWeight: 400 }}>({percentage(row.count, total) ?? 0}%)</span></strong>
        </div>
        <div aria-label={`${label(row.name)}: ${row.count}`} role="img" style={{ height: 9, background: "#edf2f7", borderRadius: 20, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(row.count / maximum) * 100}%`, background: row.tone ?? "var(--blue)", borderRadius: 20 }} />
        </div>
      </div>
    ))}
  </section>;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireUser();
  const params = await searchParams;
  const range = getDateRange(params.from, params.to);

  // Scope every query by the signed-in user's actual responsibility.
  const ownershipScope = buildFaultReportScope(user.role, user.id);
  const reportWhere: Prisma.FaultReportWhereInput = {
    ...ownershipScope,
    createdAt: { gte: range.from, lt: range.to },
  };
  const jobWhere = buildRepairJobScope(user.role, user.id, range.from, range.to);
  const waterPointWhere = buildWaterPointScope(user.role, user.id);

  const [
    totalReports, activeReports, restoredReports, criticalReports, rejectedReports,
    categoryGroups, priorityGroups, statusGroups, reportRecords, completedJobs,
    waterPointCount, operationalWaterPoints, repeatPointGroups, openDelays,
    technicianGroups,
  ] = await Promise.all([
    prisma.faultReport.count({ where: reportWhere }),
    prisma.faultReport.count({ where: { ...reportWhere, status: { in: ACTIVE_STATUSES } } }),
    prisma.faultReport.count({ where: { ...reportWhere, status: FaultStatus.RESTORED } }),
    prisma.faultReport.count({ where: { ...reportWhere, priority: PriorityLevel.CRITICAL, status: { in: ACTIVE_STATUSES } } }),
    prisma.faultReport.count({ where: { ...reportWhere, status: { in: [FaultStatus.REJECTED, FaultStatus.CANCELLED] } } }),
    prisma.faultReport.groupBy({ by: ["category"], where: reportWhere, _count: { _all: true }, orderBy: { _count: { category: "desc" } } }),
    prisma.faultReport.groupBy({ by: ["priority"], where: reportWhere, _count: { _all: true } }),
    prisma.faultReport.groupBy({ by: ["status"], where: reportWhere, _count: { _all: true } }),
    prisma.faultReport.findMany({
      where: reportWhere,
      select: { id: true, createdAt: true, waterPointId: true, status: true, priority: true },
      orderBy: { createdAt: "desc" },
      take: 10000,
    }),
    prisma.repairJob.findMany({
      where: { ...jobWhere, restoredAt: { not: null } },
      select: { createdAt: true, assignedAt: true, startedAt: true, completedAt: true, restoredAt: true },
      take: 10000,
    }),
    prisma.waterPoint.count({ where: waterPointWhere }),
    prisma.waterPoint.count({ where: { ...waterPointWhere, status: "OPERATIONAL" } }),
    prisma.faultReport.groupBy({ by: ["waterPointId"], where: reportWhere, _count: { _all: true }, orderBy: { _count: { waterPointId: "desc" } }, take: 5 }),
    prisma.repairDelay.count({ where: { resolvedAt: null, repairJob: { is: jobWhere } } }),
    user.role === UserRole.ADMIN || user.role === UserRole.OPERATOR
      ? prisma.repairJob.groupBy({ by: ["technicianId"], where: { ...jobWhere, technicianId: { not: null } }, _count: { _all: true }, orderBy: { _count: { technicianId: "desc" } }, take: 5 })
      : Promise.resolve([]),
  ]);

  const reportToAssignment = summarizeDurations(completedJobs.map((job) => durationHours(job.createdAt, job.assignedAt)));
  const repairDuration = summarizeDurations(completedJobs.map((job) => durationHours(job.startedAt, job.completedAt)));
  const totalDowntime = summarizeDurations(completedJobs.map((job) => durationHours(job.createdAt, job.restoredAt)));
  const technicianIds = technicianGroups.map((row) => row.technicianId).filter((id): id is string => Boolean(id));
  const technicians = technicianIds.length ? await prisma.user.findMany({ where: { id: { in: technicianIds } }, select: { id: true, name: true } }) : [];
  const technicianNames = new Map(technicians.map((technician) => [technician.id, technician.name]));
  const repeatIds = repeatPointGroups.filter((row) => row._count._all > 1).map((row) => row.waterPointId);
  const repeatPoints = repeatIds.length ? await prisma.waterPoint.findMany({ where: { id: { in: repeatIds } }, select: { id: true, code: true, name: true, county: true } }) : [];
  const repeatPointMap = new Map(repeatPoints.map((point) => [point.id, point]));

  const restorationRate = percentage(restoredReports, totalReports);
  const nonClosed = Math.max(0, totalReports - restoredReports - rejectedReports);
  const priorityRows = priorityGroups.map((row) => ({ name: row.priority, count: row._count._all }));
  const categoryRows = categoryGroups.map((row) => ({ name: row.category, count: row._count._all }));
  const statusRows = statusGroups.map((row) => ({ name: row.status, count: row._count._all }));
  const bucketDuration = (range.to.getTime() - range.from.getTime()) / 6;
  const trend = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(range.from.getTime() + bucketDuration * index);
    const end = new Date(range.from.getTime() + bucketDuration * (index + 1));
    const count = reportRecords.filter((report) => report.createdAt >= start && (index === 5 ? report.createdAt <= end : report.createdAt < end)).length;
    return { label: `${start.toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" })}`, count };
  });
  const trendMaximum = Math.max(1, ...trend.map((item) => item.count));
  const managerView = user.role === UserRole.ADMIN || user.role === UserRole.OPERATOR;

  return <>
    <div className="page-head">
      <div>
        <div className="eyebrow">Operational performance</div>
        <h1>Analytics</h1>
        <p className="muted" style={{ margin: 0 }}>Measured from recorded MajiFix activity, within your access scope.</p>
      </div>
      <Link href="/dashboard" className="btn btn-secondary">Back to dashboard</Link>
    </div>

    <section className="card" style={{ marginBottom: 20 }}>
      <form method="get" className="form-grid" aria-label="Filter analytics by date">
        <div className="field"><label htmlFor="from">From</label><input id="from" name="from" type="date" defaultValue={range.fromInput} /></div>
        <div className="field"><label htmlFor="to">To</label><input id="to" name="to" type="date" defaultValue={range.toInput} /></div>
        <div className="field full" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
          <button className="btn btn-primary" type="submit">Apply date range</button>
          <Link className="btn btn-secondary" href="/analytics">Last 30 days</Link>
          <span className="muted" style={{ fontSize: 12 }}>Dates are interpreted in Africa/Nairobi time.</span>
        </div>
      </form>
      {range.invalid && <p className="notice error" role="alert" style={{ margin: "14px 0 0" }}>The selected start date must be earlier than the end date. A default 30-day range is shown.</p>}
      <p className="muted" style={{ fontSize: 12, margin: "12px 0 0" }}>Showing {range.from.toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" })} to {new Date(range.to.getTime() - 1).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" })}. Duration summaries and the activity chart use up to 10,000 matching records. Database totals and grouped distributions are not subject to this sample cap.</p>
    </section>

    <div className="grid stats">
      <MetricCard label="Water points" value={waterPointCount} detail={`${operationalWaterPoints} currently marked operational`} />
      <MetricCard label="Fault reports" value={totalReports} detail="Submitted in selected period" />
      <MetricCard label="Active faults" value={activeReports} detail={`${criticalReports} critical and unresolved`} />
      <MetricCard label="Restoration rate" value={restorationRate === null ? "—" : `${restorationRate}%`} detail={`${restoredReports} restored from ${totalReports} reports`} />
    </div>

    <div className="grid stats">
      <MetricCard label="Report to assignment" value={formatMetricHours(reportToAssignment.averageHours)} detail={`Average across ${reportToAssignment.count} restored jobs with timestamps`} />
      <MetricCard label="Repair duration" value={formatMetricHours(repairDuration.averageHours)} detail={`Work started to repair completion · ${repairDuration.count} jobs`} />
      <MetricCard label="Total downtime" value={formatMetricHours(totalDowntime.averageHours)} detail={`Report submitted to confirmed restoration · ${totalDowntime.count} jobs`} />
      <MetricCard label="Open repair delays" value={openDelays} detail="Unresolved delays on in-scope repair jobs" />
    </div>

    <section className="card" style={{ marginBottom: 18 }}>
      <h2>Report activity across the selected period</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", alignItems: "end", gap: 12, minHeight: 150 }}>
        {trend.map((item) => <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "end", gap: 7, minWidth: 0 }}>
          <strong style={{ fontSize: 12 }}>{item.count}</strong>
          <div role="img" aria-label={`${item.count} reports from ${item.label}`} style={{ width: "100%", maxWidth: 70, height: `${Math.max(5, (item.count / trendMaximum) * 100)}px`, background: "var(--blue)", borderRadius: "7px 7px 2px 2px" }} />
          <span className="muted" style={{ fontSize: 11, textAlign: "center" }}>{item.label}</span>
        </div>)}
      </div>
      <p className="muted" style={{ fontSize: 12, margin: "12px 0 0" }}>The selected date range is divided into six equal periods. Counts are based on report submission dates.</p>
    </section>

    <div className="split">
      <Distribution title="Reports by fault category" rows={categoryRows} total={totalReports} />
      <Distribution title="Priority distribution" rows={priorityRows} total={totalReports} />
    </div>

    <div className="split" style={{ marginTop: 18 }}>
      <section className="card">
        <h2>Fault lifecycle</h2>
        {statusRows.length === 0 ? <div className="empty">No status data for this period.</div> : <div className="table-wrap"><table><thead><tr><th>Status</th><th>Reports</th><th>Share</th></tr></thead><tbody>{statusRows.map((row) => <tr key={row.name}><td>{label(row.name)}</td><td>{row.count}</td><td>{percentage(row.count, totalReports) ?? 0}%</td></tr>)}</tbody></table></div>}
        <p className="muted" style={{ fontSize: 12, margin: "14px 0 0" }}>{nonClosed} reports remain outside restored, rejected or cancelled outcomes.</p>
      </section>
      <section className="card">
        <h2>Repeat-failure water points</h2>
        {repeatPointGroups.filter((row) => row._count._all > 1).length === 0 ? <div className="empty">No water point has more than one report in this period.</div> : <div className="table-wrap"><table><thead><tr><th>Water point</th><th>County</th><th>Reports</th></tr></thead><tbody>{repeatPointGroups.filter((row) => row._count._all > 1).map((row) => {
          const point = repeatPointMap.get(row.waterPointId);
          return <tr key={row.waterPointId}><td>{point ? <><strong>{point.name}</strong><div className="muted" style={{ fontSize: 11 }}>{point.code}</div></> : "Unavailable"}</td><td>{point?.county ?? "—"}</td><td><strong>{row._count._all}</strong></td></tr>;
        })}</tbody></table></div>}
      </section>
    </div>

    {managerView && <section className="card" style={{ marginTop: 18 }}>
      <h2>Technician workload</h2>
      {technicianGroups.length === 0 ? <div className="empty">No assigned repair jobs in this period.</div> : <div className="table-wrap"><table><thead><tr><th>Technician</th><th>Assigned jobs</th></tr></thead><tbody>{technicianGroups.map((row) => <tr key={row.technicianId ?? "unassigned"}><td>{row.technicianId ? technicianNames.get(row.technicianId) ?? "Former or unavailable technician" : "Unassigned"}</td><td>{row._count._all}</td></tr>)}</tbody></table></div>}
    </section>}

    <section className="card" style={{ marginTop: 18 }}>
      <h2>How to read these metrics</h2>
      <ul style={{ margin: 0, paddingLeft: 20, color: "var(--muted)", fontSize: 13, lineHeight: 1.8 }}>
        <li>Restoration rate counts reports with a recorded community or authorised-operator restoration confirmation, divided by all reports in the selected period.</li>
        <li>Report-to-assignment, repair duration and downtime use only jobs with the required timestamps. Missing or reversed timestamps are excluded.</li>
        <li>Repeat failures count multiple reports against the same water point in the selected reporting period. They do not prove the same underlying fault recurred.</li>
        <li>Operational status is the latest recorded registry status, not a historical status as at the selected date.</li>
        <li>These are platform records, not independently verified field outcomes. They must not be presented as measured pilot impact without field validation.</li>
      </ul>
    </section>
  </>;
}
