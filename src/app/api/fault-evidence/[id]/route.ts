import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { canViewFault } from "@/lib/fault-access";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser();
  const { id } = await params;
  const evidence = await prisma.faultEvidence.findUnique({
    where: { id },
    include: {
      faultReport: {
        select: {
          reporterId: true,
          waterPoint: { select: { operatorId: true } },
          repairJob: { select: { technicianId: true } },
        },
      },
    },
  });

  if (!evidence || !canViewFault(user, evidence.faultReport)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
