import Link from "next/link";
import { notFound } from "next/navigation";
import { updateWaterPointStatusAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { canManageWaterPoint } from "@/lib/water-point-policy";

const statusErrors: Record<string, string> = {
  "invalid-status": "Choose a valid status and provide a reason of at least 10 characters.",
  "rate-limited": "Too many status changes were submitted. Wait before trying again.",
  "status-unchanged": "The water point already has that status.",
  "status-conflict": "The water-point status or assignment changed while you were editing it. Reload the page and try again.",
  "operational-requires-confirmation": "An active fault is still open. Complete the repair and obtain restoration confirmation before marking this water point operational.",
};

export default async function WaterPointDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { user } = await requireUser();
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const point = await prisma.waterPoint.findFirst({
    where: {
      id,
      ...(user.role === "OPERATOR" ? { operatorId: user.id } : {}),
      ...(user.role === "TECHNICIAN" ? { faults: { some: { repairJob: { is: { technicianId: user.id } } } } } : {}),
    },
    include: {
      faults: {
        where: user.role === "COMMUNITY" ? { reporterId: user.id } : user.role === "TECHNICIAN" ? { repairJob: { is: { technicianId: user.id } } } : {},
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, reference: true, status: true, priority: true, createdAt: true },
      },
      statusChanges: { orderBy: { createdAt: "desc" }, take: 10, include: { changedBy: { select: { name: true, role: true } } } },
      operator: { select: { name: true, email: true } },
    },
  });
  if (!point) notFound();
  const canManage = canManageWaterPoint({ role: user.role, userId: user.id, operatorId: point.operatorId });
  const activeFaultCount = canManage ? await prisma.faultReport.count({ where: { waterPointId: point.id, status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] } } }) : 0;
  const location = [point.community, point.subCounty, point.county].filter(Boolean).join(", ");

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Water point · {point.code}</div><h1>{point.name}</h1><p className="muted" style={{ margin: 0 }}>{location}</p></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {canManage && <Link href={`/water-points/${point.id}/edit`} className="btn btn-secondary">Edit details</Link>}
        <Link href={`/faults/new?waterPointId=${encodeURIComponent(point.id)}`} className="btn btn-primary">Report a fault</Link>
      </div>
    </div>
    {error && <div className="notice error" role="alert">{statusErrors[error] ?? "The requested action could not be completed."}</div>}
    <div className="split">
      <section className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}><h2 style={{ margin: 0 }}>Water-point details</h2><span className={`pill ${point.status === "OPERATIONAL" ? "pill-restored" : point.status === "NON_OPERATIONAL" ? "pill-critical" : ""}`}>{point.status.replaceAll("_", " ")}</span></div>
        {[
          ["Unique code", point.code],
          ["Infrastructure type", point.type.replaceAll("_", " ")],
          ["County", point.county],
          ["Sub-county", point.subCounty || "Not recorded"],
          ["Community / village", point.community || "Not recorded"],
          ["Estimated people served", point.peopleServed.toLocaleString("en-KE")],
          ["Assigned operator", point.operator ? `${point.operator.name} (${point.operator.email})` : "Unassigned"],
          ["School served", point.servesSchool ? "Yes" : "No"],
          ["Health facility served", point.servesHealthFacility ? "Yes" : "No"],
          ["Alternative water", point.alternativeWaterAvailable ? "Available" : "Not available"],
          ["Coordinates", point.latitude !== null && point.longitude !== null ? `${point.latitude}, ${point.longitude}` : "Not recorded"],
          ["Registered", new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(point.createdAt)],
          ["Last updated", new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(point.updatedAt)],
        ].map(([label, value]) => <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "11px 0", borderBottom: "1px solid #edf2f7", fontSize: 13 }}><span className="muted">{label}</span><strong style={{ textAlign: "right" }}>{value}</strong></div>)}
        {point.latitude !== null && point.longitude !== null && <p style={{ margin: "14px 0 0", fontSize: 13 }}><a href={`https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=16/${point.latitude}/${point.longitude}`} target="_blank" rel="noreferrer" style={{ color: "var(--blue)", fontWeight: 700 }}>View location on OpenStreetMap ↗</a></p>}
        {point.notes && <div style={{ marginTop: 18 }}><h3 style={{ fontSize: 14 }}>Operational notes</h3><p className="muted" style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6 }}>{point.notes}</p></div>}
      </section>
      <div className="grid" style={{ alignContent: "start" }}>
        {canManage && <section className="card">
          <h2>Update recorded status</h2>
          <div className="notice">Record inspection findings here. If an active fault remains open, the water point can become operational only after successful restoration confirmation. If no active fault remains, an authorised inspection can verify that the water point is operational.</div>
          <form action={updateWaterPointStatusAction} className="grid" style={{ gap: 12 }}>
            <input type="hidden" name="waterPointId" value={point.id} />
            <div className="field"><label htmlFor="status">New status</label><select id="status" name="status" defaultValue=""><option value="" disabled>Select status</option>{activeFaultCount === 0 && <option value="OPERATIONAL">Operational (verified inspection)</option>}<option value="PARTIALLY_OPERATIONAL">Partially operational</option><option value="NON_OPERATIONAL">Non-operational</option><option value="UNKNOWN">Unknown</option></select></div>
            <div className="field"><label htmlFor="reason">Reason for change</label><textarea id="reason" name="reason" minLength={10} maxLength={500} required placeholder="Record the inspection finding or reason for this status change…" /></div>
            <button className="btn btn-primary" type="submit">Save status update</button>
          </form>
        </section>}
        <section className="card">
          <h2>Recent fault reports</h2>
          {point.faults.length === 0 ? <div className="empty">No fault reports are visible for this water point.</div> : point.faults.map((fault) => <div key={fault.id} style={{ padding: "11px 0", borderBottom: "1px solid #edf2f7" }}><Link href={`/faults/${fault.id}`} style={{ fontWeight: 800, color: "var(--blue)" }}>{fault.reference}</Link><div className="muted" style={{ fontSize: 12, marginTop: 5 }}>{fault.status.replaceAll("_", " ")} · {fault.priority} · {new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(fault.createdAt)}</div></div>)}
        </section>
      </div>
    </div>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>Water-point status history</h2>
      {point.statusChanges.length === 0 ? <div className="empty">No status changes have been recorded.</div> : <div className="timeline">{point.statusChanges.map((change) => <div className="timeline-item" key={change.id}><strong style={{ fontSize: 13 }}>{change.previousStatus.replaceAll("_", " ")} → {change.newStatus.replaceAll("_", " ")}</strong><p style={{ margin: "5px 0", fontSize: 13 }}>{change.reason}</p><div className="muted" style={{ fontSize: 11 }}>{change.changedBy.name} · {change.changedBy.role} · {new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(change.createdAt)}</div></div>)}</div>}
    </section>
  </>;
}
