import Link from "next/link";
import { notFound } from "next/navigation";
import { canConfirmRestoration } from "@/lib/access-control";
import { acceptRepairAssignmentAction, addRepairEvidenceAction, assessFaultAction, assignTechnicianAction, confirmRestorationAction, declineRepairAssignmentAction, decideRepairEstimateAction, overridePriorityAction, reportRepairDelayAction, resolveRepairDelayAction, submitRepairEstimateAction, updateRepairStatusAction } from "@/lib/actions";
import { canManageFault, canViewFault } from "@/lib/fault-access";
import { parsePriorityFactors, priorityLevelForScore } from "@/lib/priority";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDuration } from "@/lib/utils";
import { isRepairCostCleared, technicianCoversAreas } from "@/lib/repair-policy";

const errorMessages: Record<string, string> = {
  invalid: "Please provide the required assessment details.",
  "invalid-cost": "Enter a valid non-negative repair estimate.",
  "invalid-decision": "This report can no longer be changed using that action.",
  "invalid-assignment": "The technician or report is not eligible for assignment. Reassignments require a reason of at least 10 characters.",
  "technician-outside-service-area": "That technician does not cover this water point's service area.",
  "invalid-update": "Provide a valid repair update.",
  "repair-estimate-not-approved": "The submitted repair estimate must be approved or resubmitted before work can continue.",
  "open-repair-delays": "Resolve all recorded repair delays before marking the repair completed.",
  "invalid-transition": "That status transition is not allowed.",
  "no-repair-job": "This report does not have an approved repair job.",
  "not-awaiting-confirmation": "This report is not awaiting restoration confirmation.",
  "invalid-confirmation": "Choose a valid restoration result.",
  "invalid-priority-override": "Choose a priority and provide a reason of 10–500 characters.",
  "closed-report": "Closed reports cannot have their priority changed.",
  "invalid-estimate": "Enter a valid non-negative estimate and supporting notes.",
  "invalid-cost-decision": "Provide a valid decision and reason of at least 10 characters.",
  "invalid-delay": "Check the delay reason, description and any spare-part details.",
  "invalid-delay-date": "The expected resolution date must be in the future.",
  "evidence-required": "Select a valid evidence file to upload.",
  "evidence-too-large": "Evidence files must not exceed 4 MB.",
  "unsupported-evidence": "Use a valid JPEG, PNG, WebP or PDF file.",
  "invalid-evidence-caption": "Evidence captions must be 300 characters or fewer.",
  "rate-limited": "Too many evidence uploads were submitted. Try again later.",
};

export default async function FaultDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; estimate?: string; delay?: string; evidence?: string }> }) {
  const { user } = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const fault = await prisma.faultReport.findUnique({
    where: { id },
    include: {
      waterPoint: true,
      reporter: { select: { id: true, name: true } },
      evidence: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true } },
      repairJob: {
        include: {
          technician: { select: { id: true, name: true } },
          confirmations: { include: { confirmedBy: { select: { name: true } } }, orderBy: { confirmedAt: "desc" } },
          assignmentHistory: { include: { technician: { select: { name: true } }, assignedBy: { select: { name: true } } }, orderBy: { assignedAt: "desc" } },
          delays: { include: { reportedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
          evidence: { include: { uploadedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
          costReviewedBy: { select: { name: true } },
        },
      },
      updates: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!fault || !canViewFault(user, fault)) notFound();

  const managers = user.role === "ADMIN" || user.role === "OPERATOR";
  const canManage = managers && canManageFault(user, fault);
  const canConfirm = canConfirmRestoration({ role: user.role, reporterId: fault.reporterId, userId: user.id }) && (user.role !== "OPERATOR" || canManage);
  const technicians = canManage ? await prisma.user.findMany({
    where: { role: "TECHNICIAN", accountStatus: "ACTIVE", technicianProfile: { is: { available: true } } },
    include: { technicianProfile: true },
    orderBy: { name: "asc" },
  }) : [];
  const requiredAreas = [fault.waterPoint.county, fault.waterPoint.subCounty].filter((area): area is string => Boolean(area));
  const eligibleTechnicians = technicians.filter((technician) => technicianCoversAreas(technician.technicianProfile?.serviceAreas ?? [], requiredAreas));
  const isAssignedTechnician = user.role === "TECHNICIAN" && fault.repairJob?.technicianId === user.id;
  const hasPriorAssignment = Boolean(fault.repairJob?.technicianId || fault.repairJob?.assignmentHistory.length);
  const hasAcceptedAssignment = fault.repairJob?.assignmentStatus === "ACCEPTED";
  const canUpdateRepair = (isAssignedTechnician && hasAcceptedAssignment) || (canManage && fault.status === "REPAIR_COMPLETED");
  const repairCostCleared = fault.repairJob ? isRepairCostCleared(fault.repairJob.costApprovalStatus) : false;
  const hasOpenRepairDelays = Boolean(fault.repairJob?.delays.some((delay) => !delay.resolvedAt));
  const statusOptions = isAssignedTechnician && hasAcceptedAssignment
    ? (fault.status === "ASSIGNED" ? (repairCostCleared ? ["IN_PROGRESS"] : []) : fault.status === "IN_PROGRESS" ? (repairCostCleared && !hasOpenRepairDelays ? ["REPAIR_COMPLETED"] : []) : [])
    : canManage && fault.status === "REPAIR_COMPLETED" && repairCostCleared && !hasOpenRepairDelays ? ["AWAITING_CONFIRMATION"] : [];
  const canRecordDelay = (isAssignedTechnician && hasAcceptedAssignment) || canManage;
  const canUploadRepairEvidence = (isAssignedTechnician && hasAcceptedAssignment) || canManage;
  const priorityFactors = parsePriorityFactors(fault.priorityFactors);
  const calculatedLevel = priorityLevelForScore(fault.priorityScore);

  return <>
    <div className="page-head">
      <div>
        <div className="eyebrow">Fault report · {fault.reference}</div>
        <h1>{fault.waterPoint.name}</h1>
        <p className="muted" style={{ margin: 0 }}>{fault.waterPoint.county} · {fault.waterPoint.code} · Reported {formatDate(fault.createdAt)}</p>
      </div>
      <span className={`pill pill-${fault.priority.toLowerCase()}`}>{fault.priority} PRIORITY</span>
    </div>

    {query.error && <div className="notice error" role="alert">{errorMessages[query.error] ?? "The requested action could not be completed."}</div>}
    {query.estimate && <div className="notice">Repair estimate update: {query.estimate}.</div>}
    {query.delay && <div className="notice">Repair delay {query.delay}.</div>}
    {query.evidence && <div className="notice">Repair evidence added.</div>}

    <div className="split">
      <div className="grid">
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <h2>Report details</h2><span className="pill">{fault.status.replaceAll("_", " ")}</span>
          </div>
          <p style={{ lineHeight: 1.7, fontSize: 14, whiteSpace: "pre-wrap" }}>{fault.description}</p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
            {[
              ["Category", fault.category.replaceAll("_", " ")],
              ["People affected", fault.peopleAffected.toLocaleString("en-KE")],
              ["Reported downtime", formatDuration(fault.downtimeHours)],
              ["Reported by", fault.reporter.name],
              ["Alternative source", fault.alternativeWaterAvailable ? "Available" : "Not available"],
              ["All service interrupted", fault.allServiceInterrupted ? "Yes" : "No"],
            ].map(([label, value]) => <div key={label}><div className="muted" style={{ fontSize: 11 }}>{label}</div><strong style={{ fontSize: 13 }}>{value}</strong></div>)}
          </div>
          {fault.operatorOverrideReason && <div className="notice" style={{ marginTop: 16, marginBottom: 0 }}>Priority manually set to {fault.priority}. Reason: {fault.operatorOverrideReason}</div>}
        </section>

        <section className="card">
          <h2>Priority assessment</h2>
          <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>Original calculated priority: {calculatedLevel} · {fault.priorityScore} points. The factor snapshot is preserved from report submission. This supports operator review and is not an automated safety or water-quality assessment.</p>
          {priorityFactors.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>No additional priority factors were recorded for this report.</p> : <div className="grid" style={{ gap: 10 }}>
            {priorityFactors.map((factor) => <div key={factor.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
              <div><strong style={{ fontSize: 13 }}>{factor.label}</strong><div className="muted" style={{ fontSize: 11 }}>{factor.explanation}</div></div><strong style={{ fontSize: 13 }}>+{factor.points}</strong>
            </div>)}
          </div>}
        </section>

        {fault.evidence.length > 0 && <section className="card">
          <h2>Supporting evidence</h2>
          <div className="grid" style={{ gap: 10 }}>
            {fault.evidence.map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div><strong style={{ fontSize: 13 }}>{item.originalName}</strong><div className="muted" style={{ fontSize: 11 }}>{item.mimeType} · {(item.sizeBytes / 1024).toFixed(0)} KB · {formatDate(item.createdAt)}</div></div>
              <a className="btn btn-secondary" href={`/api/fault-evidence/${item.id}`}>Download</a>
            </div>)}
          </div>
        </section>}

        {fault.repairJob && <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Repair job</h2><span className="pill">Assignment {fault.repairJob.assignmentStatus}</span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, marginTop: 15 }}>
            <div><div className="muted" style={{ fontSize: 11 }}>Assigned technician</div><strong style={{ fontSize: 13 }}>{fault.repairJob.technician?.name ?? "Awaiting assignment"}</strong></div>
            <div><div className="muted" style={{ fontSize: 11 }}>Accepted</div><strong style={{ fontSize: 13 }}>{fault.repairJob.acceptedAt ? formatDate(fault.repairJob.acceptedAt) : "Not accepted"}</strong></div>
            <div><div className="muted" style={{ fontSize: 11 }}>Started</div><strong style={{ fontSize: 13 }}>{fault.repairJob.startedAt ? formatDate(fault.repairJob.startedAt) : "Not started"}</strong></div>
            <div><div className="muted" style={{ fontSize: 11 }}>Repair completed</div><strong style={{ fontSize: 13 }}>{fault.repairJob.completedAt ? formatDate(fault.repairJob.completedAt) : "Not completed"}</strong></div>
          </div>
          {fault.repairJob.declineReason && <div className="notice" style={{ marginTop: 14, marginBottom: 0 }}>Previous assignment declined: {fault.repairJob.declineReason}</div>}
          {fault.repairJob.assignmentHistory.length > 0 && <div style={{ marginTop: 18 }}><h3 style={{ fontSize: 14, marginBottom: 9 }}>Assignment history</h3><div className="timeline">{fault.repairJob.assignmentHistory.map((entry) => <div className="timeline-item" key={entry.id}><strong style={{ fontSize: 13 }}>{entry.technician.name}</strong><div className="muted" style={{ fontSize: 11 }}>{formatDate(entry.assignedAt)} · Assigned by {entry.assignedBy.name}{entry.endedAt ? ` · Ended ${formatDate(entry.endedAt)}` : " · Current assignment"}</div>{entry.notes && <p style={{ fontSize: 12, marginBottom: 0 }}>{entry.notes}</p>}{entry.endReason && <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>End reason: {entry.endReason}</p>}</div>)}</div></div>}
        </section>}

        {fault.repairJob && <section className="card">
          <h2>Repair estimates and approval</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
            <div><div className="muted" style={{ fontSize: 11 }}>Technician estimate</div><strong>KES {fault.repairJob.estimatedCost === null ? "Not submitted" : Number(fault.repairJob.estimatedCost).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</strong></div>
            <div><div className="muted" style={{ fontSize: 11 }}>Approved amount</div><strong>KES {fault.repairJob.approvedCost === null ? "Not approved" : Number(fault.repairJob.approvedCost).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</strong></div>
          </div>
          <p className="muted" style={{ fontSize: 12 }}>Cost approval: {fault.repairJob.costApprovalStatus.replaceAll("_", " ")}{fault.repairJob.costReviewedBy ? ` · Reviewed by ${fault.repairJob.costReviewedBy.name}` : ""}</p>
          {!repairCostCleared && <div className="notice" style={{ marginBottom: 0 }}>Work cannot start or be completed while a submitted estimate is pending or rejected. Submit a revised estimate or obtain approval.</div>}
          {fault.repairJob.costApprovalReason && <p style={{ fontSize: 13 }}>Decision reason: {fault.repairJob.costApprovalReason}</p>}
          {isAssignedTechnician && hasAcceptedAssignment && ["ASSIGNED", "IN_PROGRESS"].includes(fault.status) && <form action={submitRepairEstimateAction} className="grid" style={{ marginTop: 14 }}>
            <input type="hidden" name="faultId" value={fault.id}/>
            <div className="field"><label htmlFor="estimatedCostSubmit">Estimated repair cost (KES)</label><input id="estimatedCostSubmit" name="estimatedCost" type="number" min="0" max="1000000000" step="0.01" required defaultValue={fault.repairJob.estimatedCost === null ? "" : Number(fault.repairJob.estimatedCost)}/></div>
            <div className="field"><label htmlFor="estimateNotes">Estimate details</label><textarea id="estimateNotes" name="notes" required minLength={4} maxLength={1000} placeholder="List labour, parts and other cost assumptions."/></div>
            <button className="btn btn-secondary">Submit estimate for approval</button>
          </form>}
          {canManage && fault.repairJob.costApprovalStatus === "PENDING" && <form action={decideRepairEstimateAction} className="grid" style={{ marginTop: 14 }}>
            <input type="hidden" name="faultId" value={fault.id}/>
            <div className="field"><label htmlFor="costDecisionReason">Approval / rejection reason</label><textarea id="costDecisionReason" name="reason" required minLength={10} maxLength={500}/></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="btn btn-primary" name="decision" value="APPROVE">Approve estimate</button><button className="btn btn-danger" name="decision" value="REJECT">Reject estimate</button></div>
          </form>}
        </section>}

        {fault.repairJob && <section className="card">
          <h2>Delays and spare parts</h2>
          {fault.repairJob.delays.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>No repair delays have been recorded.</p> : <div className="grid" style={{ gap: 12 }}>{fault.repairJob.delays.map((delay) => <div key={delay.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 13 }}>{delay.reason.replaceAll("_", " ")}</strong><span className="pill">{delay.resolvedAt ? "RESOLVED" : "OPEN"}</span></div><p style={{ fontSize: 13, margin: "6px 0" }}>{delay.description}</p>{delay.partName && <p className="muted" style={{ fontSize: 12, margin: 0 }}>Part: {delay.partName}{delay.quantity ? ` · Quantity: ${delay.quantity}` : ""}{delay.supplier ? ` · Supplier: ${delay.supplier}` : ""}</p>}<p className="muted" style={{ fontSize: 11, margin: "5px 0" }}>Reported by {delay.reportedBy.name} · {formatDate(delay.createdAt)}{delay.expectedResolutionAt ? ` · Expected ${formatDate(delay.expectedResolutionAt)}` : ""}</p>{delay.resolvedAt && delay.resolutionNotes && <p style={{ fontSize: 12, margin: 0 }}>Resolution: {delay.resolutionNotes}</p>}{!delay.resolvedAt && canRecordDelay && <form action={resolveRepairDelayAction} className="form-grid" style={{ marginTop: 8 }}><input type="hidden" name="delayId" value={delay.id}/><div className="field"><label htmlFor={`resolve-${delay.id}`}>Resolution notes</label><input id={`resolve-${delay.id}`} name="resolutionNotes" required minLength={4} maxLength={500}/></div><button className="btn btn-secondary">Mark resolved</button></form>}</div>)}</div>}
          {canRecordDelay && ["ASSIGNED", "IN_PROGRESS"].includes(fault.status) && <form action={reportRepairDelayAction} className="grid" style={{ marginTop: 16 }}>
            <input type="hidden" name="faultId" value={fault.id}/>
            <div className="field"><label htmlFor="delayReason">Delay reason</label><select id="delayReason" name="reason"><option value="SPARE_PARTS_UNAVAILABLE">Spare parts unavailable</option><option value="TRANSPORT">Transport</option><option value="WEATHER">Weather</option><option value="SITE_ACCESS">Site access</option><option value="FUNDING">Funding</option><option value="TECHNICAL_COMPLEXITY">Technical complexity</option><option value="OTHER">Other</option></select></div>
            <div className="field"><label htmlFor="delayDescription">Explain the delay</label><textarea id="delayDescription" name="description" required minLength={10} maxLength={1000}/></div>
            <div className="form-grid"><div className="field"><label htmlFor="partName">Spare part (if applicable)</label><input id="partName" name="partName" maxLength={120}/></div><div className="field"><label htmlFor="quantity">Quantity</label><input id="quantity" name="quantity" type="number" min="1" max="100000"/></div><div className="field"><label htmlFor="supplier">Supplier</label><input id="supplier" name="supplier" maxLength={120}/></div><div className="field"><label htmlFor="expectedResolutionAt">Expected resolution</label><input id="expectedResolutionAt" name="expectedResolutionAt" type="datetime-local"/></div></div>
            <button className="btn btn-secondary">Record repair delay</button>
          </form>}
        </section>}

        {fault.repairJob && <section className="card">
          <h2>Repair evidence</h2>
          {fault.repairJob.evidence.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>No repair evidence has been uploaded.</p> : <div className="grid" style={{ gap: 8 }}>{fault.repairJob.evidence.map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div><strong style={{ fontSize: 13 }}>{item.originalName}</strong><div className="muted" style={{ fontSize: 11 }}>{item.mimeType} · {formatDate(item.createdAt)} · {item.uploadedBy.name}{item.caption ? ` · ${item.caption}` : ""}</div></div><a className="btn btn-secondary" href={`/api/repair-evidence/${item.id}`}>Download</a></div>)}</div>}
          {canUploadRepairEvidence && <form action={addRepairEvidenceAction} encType="multipart/form-data" className="grid" style={{ marginTop: 14 }}><input type="hidden" name="faultId" value={fault.id}/><div className="field"><label htmlFor="repairEvidence">Upload evidence (JPEG, PNG, WebP or PDF, max 4 MB)</label><input id="repairEvidence" name="evidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required/></div><div className="field"><label htmlFor="repairEvidenceCaption">Caption</label><input id="repairEvidenceCaption" name="caption" maxLength={300} placeholder="Describe the work shown"/></div><button className="btn btn-secondary">Upload repair evidence</button></form>}
        </section>}

        <section className="card">
          <h2>Fault and repair timeline</h2>
          {fault.updates.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>No timeline updates have been recorded.</p> : <div className="timeline">
            {fault.updates.map((update) => <div className="timeline-item" key={update.id}>
              <strong style={{ fontSize: 13 }}>{update.status.replaceAll("_", " ")}</strong>
              <div className="muted" style={{ fontSize: 11, margin: "3px 0 6px" }}>{update.author.name} · {formatDate(update.createdAt)}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{update.notes}</div>
            </div>)}
          </div>}
        </section>
      </div>

      <aside className="grid">
        {canManage && ["REPORTED", "UNDER_ASSESSMENT"].includes(fault.status) && <section className="card">
          <h2>Assess report</h2>
          <form action={assessFaultAction} className="grid">
            <input type="hidden" name="faultId" value={fault.id} />
            <div className="field"><label htmlFor="estimatedCost">Estimated repair cost (KES)</label><input id="estimatedCost" name="estimatedCost" type="number" min="0" max="1000000000" step="0.01" placeholder="Optional" /></div>
            <div className="field"><label htmlFor="assessmentNotes">Assessment notes / reason</label><textarea id="assessmentNotes" name="notes" required minLength={4} maxLength={1000} /></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {fault.status === "REPORTED" && <button name="decision" value="ASSESS" className="btn btn-secondary">Start assessment</button>}
              <button name="decision" value="APPROVE" className="btn btn-primary">Approve repair</button>
              <button name="decision" value="REJECT" className="btn btn-danger">Reject</button>
            </div>
          </form>
        </section>}

        {isAssignedTechnician && fault.repairJob?.assignmentStatus === "PENDING" && fault.status === "ASSIGNED" && <section className="card">
          <h2>Respond to assignment</h2>
          <p className="muted" style={{ fontSize: 13 }}>Accept the assignment before starting work. If you cannot take it, provide a reason so the operator can reassign the repair.</p>
          <form action={acceptRepairAssignmentAction}><input type="hidden" name="faultId" value={fault.id}/><button className="btn btn-primary">Accept assignment</button></form>
          <form action={declineRepairAssignmentAction} className="grid" style={{ marginTop: 12 }}><input type="hidden" name="faultId" value={fault.id}/><div className="field"><label htmlFor="declineReasonDetail">Reason for declining (10–500 characters)</label><textarea id="declineReasonDetail" name="reason" required minLength={10} maxLength={500}/></div><button className="btn btn-danger">Decline assignment</button></form>
        </section>}

        {canManage && ["APPROVED", "REOPENED", "ASSIGNED", "IN_PROGRESS"].includes(fault.status) && <section className="card">
          <h2>{hasPriorAssignment ? "Reassign technician" : "Assign technician"}</h2>
          {eligibleTechnicians.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>No available technicians cover this water point&apos;s service area.</p> : <form action={assignTechnicianAction} className="grid">
            <input type="hidden" name="faultId" value={fault.id} />
            <div className="field"><label htmlFor="technicianId">Technician</label><select id="technicianId" name="technicianId" required defaultValue=""><option value="" disabled>Select technician</option>{eligibleTechnicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}{technician.technicianProfile?.skills.length ? ` · ${technician.technicianProfile.skills.join(", ")}` : ""}</option>)}</select></div>
            {hasPriorAssignment && <div className="field"><label htmlFor="assignmentReason">Reason for reassignment (10–500 characters)</label><textarea id="assignmentReason" name="assignmentReason" required minLength={10} maxLength={500}/></div>}
            <button className="btn btn-primary">{hasPriorAssignment ? "Reassign technician" : "Assign technician"}</button>
          </form>}
        </section>}

        {canUpdateRepair && fault.repairJob && statusOptions.length === 0 && <div className="notice">The next repair status is currently blocked. Resolve open delays and ensure any submitted estimate has been approved before continuing.</div>}
        {canUpdateRepair && fault.repairJob && statusOptions.length > 0 && <section className="card">
          <h2>Update repair</h2>
          <form action={updateRepairStatusAction} className="grid">
            <input type="hidden" name="faultId" value={fault.id} />
            <div className="field"><label htmlFor="nextStatus">Next status</label><select id="nextStatus" name="status">{statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div>
            <div className="field"><label htmlFor="repairNotes">Work update</label><textarea id="repairNotes" name="notes" required minLength={4} maxLength={1000} placeholder="Describe the work completed or next steps…" /></div>
            <button className="btn btn-primary">Save update</button>
          </form>
        </section>}

        {fault.status === "AWAITING_CONFIRMATION" && canConfirm && <section className="card">
          <h2>Confirm water restoration</h2>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>Check the water point. Confirm restoration only if water is flowing and the service is usable.</p>
          <form action={confirmRestorationAction} className="grid">
            <input type="hidden" name="faultId" value={fault.id} />
            <div className="field"><label htmlFor="result">Verification result</label><select id="result" name="result"><option value="WATER_RESTORED">Water service is restored</option><option value="NOT_RESTORED">Water service is not restored</option></select></div>
            <div className="field"><label htmlFor="confirmationNotes">Confirmation notes</label><textarea id="confirmationNotes" name="notes" maxLength={1000} placeholder="Optional details…" /></div>
            <button className="btn btn-primary">Submit confirmation</button>
          </form>
        </section>}

        {canManage && !["RESTORED", "REJECTED", "CANCELLED"].includes(fault.status) && <section className="card">
          <h2>Adjust priority</h2>
          <p className="muted" style={{ fontSize: 12 }}>Original calculated priority: {calculatedLevel} · {fault.priorityScore} points.</p>
          <form action={overridePriorityAction} className="grid">
            <input type="hidden" name="faultId" value={fault.id} />
            <div className="field"><label htmlFor="priority">Priority level</label><select id="priority" name="priority" defaultValue={fault.priority}><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="NORMAL">Normal</option></select></div>
            <div className="field"><label htmlFor="overrideReason">Reason for override (10–500 characters)</label><textarea id="overrideReason" name="reason" required minLength={10} maxLength={500} /></div>
            <button className="btn btn-secondary">Save priority override</button>
          </form>
        </section>}

        <section className="card">
          <h2>Repair assignment</h2>
          <div style={{ fontSize: 13 }}><div className="muted">Assigned technician</div><strong>{fault.repairJob?.technician?.name ?? "Not assigned"}</strong></div>
          {fault.repairJob?.estimatedCost !== null && fault.repairJob?.estimatedCost !== undefined && <div style={{ marginTop: 14, fontSize: 13 }}><div className="muted">Estimated cost</div><strong>KES {Number(fault.repairJob.estimatedCost).toLocaleString("en-KE")}</strong></div>}
          {fault.repairJob?.confirmations[0] && <div className="notice" style={{ marginTop: 16, marginBottom: 0 }}>Last confirmation: {fault.repairJob.confirmations[0].result.replaceAll("_", " ")} by {fault.repairJob.confirmations[0].confirmedBy.name}.</div>}
        </section>
        <Link href="/faults" className="btn btn-secondary">← Back to reports</Link>
      </aside>
    </div>
  </>;
}
