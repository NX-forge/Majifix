import Link from "next/link";
import { createWaterPointAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth-guard";
import { WaterPointForm } from "@/components/water-point-form";
import { prisma } from "@/lib/prisma";

const errors: Record<string, string> = {
  invalid: "Check the form. Some fields are missing or invalid. If you entered coordinates, provide both latitude and longitude.",
  "duplicate-code": "That water-point code is already in use. Choose a different code.",
  "invalid-operator": "Select an active operator account or leave the water point unassigned.",
};

export default async function NewWaterPointPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await requireUser(["ADMIN", "OPERATOR"]);
  const { error } = await searchParams;
  const operators = user.role === "ADMIN" ? await prisma.user.findMany({ where: { role: "OPERATOR", accountStatus: "ACTIVE" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }) : [];
  return <>
    <div className="page-head">
      <div><div className="eyebrow">Registry</div><h1>Register a water point</h1><p className="muted" style={{ margin: 0 }}>Add the information needed to identify, locate and maintain this water point.</p></div>
      <Link href="/water-points" className="btn btn-secondary">Back to registry</Link>
    </div>
    {error && <div className="notice error" role="alert">{errors[error] ?? "The request could not be completed."}</div>}
    <WaterPointForm action={createWaterPointAction} submitLabel="Register water point" operators={operators} allowOperatorAssignment={user.role === "ADMIN"} />
  </>;
}
