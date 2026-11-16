import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { hasRequiredRole, isAccountActive } from "@/lib/access-control";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser(roles?: UserRole[]) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user = session.user as typeof session.user & {
    role?: UserRole;
    accountStatus?: "PENDING" | "ACTIVE" | "SUSPENDED";
  };

  if (!isAccountActive(user.accountStatus)) {
    redirect(user.accountStatus === "SUSPENDED" ? "/account/suspended" : "/account/pending");
  }

  const role = user.role ?? "COMMUNITY";
  if (!hasRequiredRole(role, roles)) redirect("/dashboard?error=forbidden");

  return { ...session, user: { ...user, role } };
}
