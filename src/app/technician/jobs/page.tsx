import Link from "next/link";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { acceptRepairAssignmentAction, declineRepairAssignmentAction } from "@/lib/actions";
import { formatDate } from "@/lib/utils";

export default async function TechnicianJobsPage({ searchParams }: { searchParams: Promise<{ error?: string; accepted?: string; declined?: string }> }) {
  const { user } = await requireUser(["TECHNICIAN"]);
  const query = await searchParams;
  const jobs = await prisma.faultReport.findMany({
    where: { repairJob: { is: { technicianId: user.id } } },
    include: {
      waterPoint: { select: { id: true, name: true, code: true, county: true, subCounty: true, community: true } },
      repairJob: { include: { delays: { where: { resolvedAt: null }, select: { id: true } }, evidence: { select: { id: true } } } },
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
  });
  const pending = jobs.filter((job) => job.repairJob?.assignmentStatus === "PENDING");
  const active = jobs.filter((job) => job.repairJob?.assignmentStatus === "ACCEPTED");
  const closed = jobs.filter((job) => ["RESTORED", "REJECTED", "CANCELLED"].includes(job.status));
  const errorMessages: Record<string, string> = {
    "invalid-decline-reason": "Provide a reason of at least 10 characters when declining an assignment.",
    "invalid-assignment": "That assignment is no longer available.",
  };

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Technician workspace</div><h1>My repair jobs</h1><p className="muted" style={{ margin: 0 }}>Review assignments, update repair progress and record delays.</p></div>
      <Link href="/faults" className="btn btn-secondary">All visible reports</Link>
    </div>
    {query.error && <div className="notice error" role="alert">{errorMessages[query.error] ?? "The requested action could not be completed."}</div>}
    {query.accepted && <div className="notice">Assignment accepted. You can now start work and submit repair updates.</div>}
    {query.declined && <div className="notice">Assignment declined. The operator can assign another technician.</div>}
    <div className="grid stats">
      {[{ label: "Awaiting response", value: pending.length }, { label: "Accepted jobs", value: active.length }, { label: "Unresolved delays", value: jobs.reduce((total, job) => total + (job.repairJob?.delays.length ?? 0), 0) }, { label: "Closed reports", value: closed.length }].map((item) => <div className="card" key={item.label}><div className="stat-label">{item.label}</div><div className="stat-value">{item.value}</div></div>)}
    </div>
    {jobs.length === 0 ? <div className="card empty">You do not have any repair assignments yet. New assignments will appear here.</div> : <div className="grid">
      {jobs.map((job) => <section className="card" key={job.id}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div><div className="eyebrow">{job.reference}</div><h2 style={{ marginTop: 6, marginBottom: 5 }}>{job.waterPoint.name}</h2><p className="muted" style={{ margin: 0, fontSize: 13 }}>{job.waterPoint.county}{job.waterPoint.subCounty ? ` · ${job.waterPoint.subCounty}` : ""} · {job.waterPoint.code}</p></div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><span className={`pill pill-${job.priority.toLowerCase()}`}>{job.priority}</span><span className="pill">{job.status.replaceAll("_", " ")}</span><span className="pill">{job.repairJob?.assignmentStatus}</span></div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, margin: "16px 0" }}>
          <div><div className="muted" style={{ fontSize: 11 }}>Assigned</div><strong style={{ fontSize: 13 }}>{job.repairJob?.assignedAt ? formatDate(job.repairJob.assignedAt) : "—"}</strong></div>
          <div><div className="muted" style={{ fontSize: 11 }}>Estimated cost</div><strong style={{ fontSize: 13 }}>{job.repairJob?.estimatedCost === null || job.repairJob?.estimatedCost === undefined ? "Not submitted" : `KES ${Number(job.repairJob.estimatedCost).toLocaleString("en-KE")}`}</strong></div>
          <div><div className="muted" style={{ fontSize: 11 }}>Open delays</div><strong style={{ fontSize: 13 }}>{job.repairJob?.delays.length ?? 0}</strong></div>
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={`/faults/${job.id}`} className="btn btn-secondary">Open repair details</Link>
          {job.repairJob?.assignmentStatus === "PENDING" && job.status === "ASSIGNED" && <>
            <form action={acceptRepairAssignmentAction}><input type="hidden" name="faultId" value={job.id}/><button className="btn btn-primary">Accept assignment</button></form>
            <form action={declineRepairAssignmentAction} className="form-grid" style={{ flex: "1 1 300px", alignItems: "end" }}><input type="hidden" name="faultId" value={job.id}/><div className="field"><label htmlFor={`decline-${job.id}`}>Reason for declining</label><input id={`decline-${job.id}`} name="reason" required minLength={10} maxLength={500} placeholder="Explain why you cannot take this job"/></div><button className="btn btn-danger">Decline</button></form>
          </>}
        </div>
      </section>)}
    </div>}
  </>;
}
