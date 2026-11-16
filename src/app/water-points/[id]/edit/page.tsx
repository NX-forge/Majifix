import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WaterPointForm } from "@/components/water-point-form";
import { updateWaterPointAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { canManageWaterPoint } from "@/lib/water-point-policy";

const errors: Record<string, string> = {
  invalid: "Check the form. Provide valid details and both coordinates, or leave both blank.",
  "duplicate-code": "That water-point code is already in use. Choose a different code.",
  "invalid-operator": "Select an active operator account or leave the water point unassigned.",
};

export default async function EditWaterPointPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { user } = await requireUser(["ADMIN", "OPERATOR"]);
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const point = await prisma.waterPoint.findUnique({ where: { id } });
  if (!point) notFound();
  if (!canManageWaterPoint({ role: user.role, userId: user.id, operatorId: point.operatorId })) redirect("/water-points?error=forbidden");
  const operators = user.role === "ADMIN" ? await prisma.user.findMany({ where: { role: "OPERATOR", accountStatus: "ACTIVE" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }) : [];

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Registry · {point.code}</div><h1>Edit water point</h1><p className="muted" style={{ margin: 0 }}>Update the registry details. Operational status is managed separately.</p></div>
      <Link href={`/water-points/${point.id}`} className="btn btn-secondary">Cancel</Link>
    </div>
    {error && <div className="notice error" role="alert">{errors[error] ?? "The request could not be completed."}</div>}
    <WaterPointForm action={updateWaterPointAction} submitLabel="Save changes" waterPoint={point} operators={operators} allowOperatorAssignment={user.role === "ADMIN"} />
  </>;
}
