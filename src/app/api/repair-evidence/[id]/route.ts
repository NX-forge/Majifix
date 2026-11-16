import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { canManageRepair, canTechnicianRespondToAssignment } from "@/lib/repair-policy";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser();
  const { id } = await params;
  const evidence = await prisma.repairEvidence.findUnique({
    where: { id },
    include: { repairJob: { include: { faultReport: { include: { waterPoint: { select: { operatorId: true } } } } } } },
  });
  if (!evidence) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const job = evidence.repairJob;
  const allowed = user.role === "TECHNICIAN"
    ? canTechnicianRespondToAssignment(user, job.technicianId) || evidence.uploadedById === user.id
    : canManageRepair(user, { operatorId: job.faultReport.waterPoint.operatorId, technicianId: job.technicianId }) || (user.role === "COMMUNITY" && job.faultReport.reporterId === user.id);
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new Response(Buffer.from(evidence.data), {
    headers: {
      "Content-Type": evidence.mimeType,
      "Content-Length": String(evidence.sizeBytes),
      "Content-Disposition": `attachment; filename="${evidence.originalName.replace(/["\\\r\n]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
