import Link from "next/link";
import { notFound } from "next/navigation";
import { createFaultReportAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { waterPointVisibilityWhere } from "@/lib/water-point-policy";

const errorMessages: Record<string, string> = {
  invalid: "Check the report details and correct the highlighted information.",
  "water-point-not-found": "That water point is unavailable in your registry access. Refresh the page and try again.",
  "evidence-too-large": "The evidence file must be 4 MB or smaller.",
  "evidence-empty": "The selected evidence file is empty. Choose a valid file or remove the attachment.",
  "unsupported-evidence": "Evidence must be a genuine JPEG, PNG, WebP or PDF file.",
  "rate-limited": "You have submitted 10 reports in the last hour. Please wait before submitting another report.",
};

export default async function NewFaultPage({ searchParams }: { searchParams: Promise<{ waterPointId?: string; error?: string; duplicate?: string }> }) {
  const { user } = await requireUser(["ADMIN", "OPERATOR", "COMMUNITY"]);
  const params = await searchParams;
  const points = await prisma.waterPoint.findMany({
    where: waterPointVisibilityWhere({ role: user.role, userId: user.id }),
    orderBy: [{ county: "asc" }, { name: "asc" }],
    select: { id: true, code: true, name: true, county: true, status: true },
  });
  const duplicate = params.duplicate
    ? await prisma.faultReport.findFirst({ where: { reference: params.duplicate, reporterId: user.id }, select: { id: true, reference: true } })
    : null;
  if (params.waterPointId && !points.some((point) => point.id === params.waterPointId)) notFound();

  return <>
    <div className="page-head">
      <div>
        <div className="eyebrow">New report</div>
        <h1>Report a water-point fault</h1>
        <p className="muted" style={{ margin: 0 }}>Describe the problem and its impact so the responsible operator can assess it.</p>
      </div>
      <Link href="/faults" className="btn btn-secondary">Back to reports</Link>
    </div>

    {params.error && <div className="notice error" role="alert">{errorMessages[params.error] ?? "The report could not be submitted. Please try again."}</div>}
    {duplicate && <div className="notice" role="status">A similar active report was submitted in the last 30 minutes. <Link href={`/faults/${duplicate.id}`}>{duplicate.reference}</Link>. Open that report to add an update instead of creating a duplicate.</div>}

    {points.length === 0 ? (
      <div className="notice">No water points are available in your registry access. Ask an administrator or assigned operator to check the registry.</div>
    ) : (
      <form action={createFaultReportAction} className="card">
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="waterPointId">Water point</label>
            <select id="waterPointId" name="waterPointId" required defaultValue={params.waterPointId ?? ""}>
              <option value="" disabled>Select a water point</option>
              {points.map((point) => <option key={point.id} value={point.id}>{point.name} · {point.county} · {point.code} · {point.status.replaceAll("_", " ")}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="category">Fault category</label>
            <select id="category" name="category" required defaultValue="PUMP_FAILURE">
              <option value="MECHANICAL_FAILURE">Mechanical failure</option>
              <option value="PUMP_FAILURE">Pump failure</option>
              <option value="ELECTRICAL_FAILURE">Electrical failure</option>
              <option value="PIPE_LEAKAGE">Pipe leakage</option>
              <option value="WATER_QUALITY_CONCERN">Water quality concern</option>
              <option value="LOW_YIELD">Low water yield</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="peopleAffected">Estimated people affected</label>
            <input id="peopleAffected" name="peopleAffected" type="number" min="0" max="1000000" defaultValue="0" required />
          </div>
          <div className="field">
            <label htmlFor="downtimeHours">How long has the fault lasted? (hours)</label>
            <input id="downtimeHours" name="downtimeHours" type="number" min="0" max="8760" defaultValue="0" required />
          </div>
          <div className="field full">
            <label htmlFor="description">Describe the problem</label>
            <textarea id="description" name="description" minLength={10} maxLength={2000} required placeholder="Describe what happened, when it started and any visible symptoms…" />
          </div>
          <div className="field full">
            <label htmlFor="evidence">Supporting evidence (optional)</label>
            <input id="evidence" name="evidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
            <span className="muted" style={{ fontSize: 12 }}>One JPEG, PNG, WebP or PDF file. Maximum size: 4 MB.</span>
          </div>
          <div className="field" style={{ gap: 12 }}>
            <label className="checkbox"><input name="allServiceInterrupted" type="checkbox" /> All water service has stopped</label>
          </div>
          <div className="field">
            <label htmlFor="alternativeWaterAvailable">Is another water source available?</label>
            <select id="alternativeWaterAvailable" name="alternativeWaterAvailable" required defaultValue="">
              <option value="" disabled>Select availability</option>
              <option value="true">Yes, another source is available</option>
              <option value="false">No, there is no alternative source</option>
            </select>
          </div>
          <div className="field" style={{ justifyContent: "center" }}>
            <div className="notice" style={{ margin: 0 }}>MajiFix calculates a suggested priority from the information provided and the water point's registered facilities. An authorised operator can change it with a recorded reason.</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
          <button className="btn btn-primary" type="submit">Submit fault report</button>
        </div>
      </form>
    )}
  </>;
}
