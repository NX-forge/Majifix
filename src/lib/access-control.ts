export type AccessRole = "ADMIN" | "OPERATOR" | "TECHNICIAN" | "COMMUNITY";
export type AccessAccountStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export function isAccountActive(status: string | null | undefined): status is "ACTIVE" {
  return status === "ACTIVE";
}

export function hasRequiredRole(role: string | null | undefined, allowedRoles?: readonly string[]): boolean {
  if (!allowedRoles) return true;
  return typeof role === "string" && allowedRoles.includes(role);
}

export function wouldRemoveLastActiveAdministrator(input: {
  currentRole: AccessRole;
  currentStatus: AccessAccountStatus;
  nextRole: AccessRole;
  nextStatus: AccessAccountStatus;
  activeAdministratorCount: number;
}): boolean {
  const isCurrentlyActiveAdministrator = input.currentRole === "ADMIN" && input.currentStatus === "ACTIVE";
  const remainsActiveAdministrator = input.nextRole === "ADMIN" && input.nextStatus === "ACTIVE";
  return isCurrentlyActiveAdministrator && !remainsActiveAdministrator && input.activeAdministratorCount <= 1;
}

export function canConfirmRestoration(input: {
  role: string;
  reporterId: string;
  userId: string;
}): boolean {
  if (input.role === "ADMIN" || input.role === "OPERATOR") return true;
  return input.role === "COMMUNITY" && input.reporterId === input.userId;
}
