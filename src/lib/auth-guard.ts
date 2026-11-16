import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { UserRole } from "@/generated/prisma/client";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser(roles?: UserRole[]) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const user = session.user as typeof session.user & { role?: UserRole };
  if (roles && !roles.includes(user.role ?? "COMMUNITY")) redirect("/dashboard?error=forbidden");
  return { ...session, user: { ...user, role: user.role ?? "COMMUNITY" } };
}
