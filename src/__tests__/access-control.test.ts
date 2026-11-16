import { describe, expect, it } from "vitest";
import {
  canConfirmRestoration,
  hasRequiredRole,
  isAccountActive,
  wouldRemoveLastActiveAdministrator,
} from "@/lib/access-control";

describe("account activation policy", () => {
  it("allows sessions only for active accounts", () => {
    expect(isAccountActive("ACTIVE")).toBe(true);
    expect(isAccountActive("PENDING")).toBe(false);
    expect(isAccountActive("SUSPENDED")).toBe(false);
    expect(isAccountActive(undefined)).toBe(false);
  });
});

describe("role access policy", () => {
  it("allows all authenticated roles when no role restriction is supplied", () => {
    expect(hasRequiredRole("COMMUNITY")).toBe(true);
  });

  it("allows a role only when it appears in the permitted roles", () => {
    expect(hasRequiredRole("ADMIN", ["ADMIN", "OPERATOR"])).toBe(true);
    expect(hasRequiredRole("COMMUNITY", ["ADMIN", "OPERATOR"])).toBe(false);
    expect(hasRequiredRole(undefined, ["ADMIN"])).toBe(false);
  });
});

describe("last administrator protection", () => {
  const currentAdmin = {
    currentRole: "ADMIN" as const,
    currentStatus: "ACTIVE" as const,
    nextRole: "OPERATOR" as const,
    nextStatus: "ACTIVE" as const,
  };

  it("prevents demoting the only active administrator", () => {
    expect(wouldRemoveLastActiveAdministrator({ ...currentAdmin, activeAdministratorCount: 1 })).toBe(true);
  });

  it("allows demotion when another active administrator exists", () => {
    expect(wouldRemoveLastActiveAdministrator({ ...currentAdmin, activeAdministratorCount: 2 })).toBe(false);
  });

  it("prevents suspending the only active administrator", () => {
    expect(wouldRemoveLastActiveAdministrator({
      currentRole: "ADMIN",
      currentStatus: "ACTIVE",
      nextRole: "ADMIN",
      nextStatus: "SUSPENDED",
      activeAdministratorCount: 1,
    })).toBe(true);
  });

  it("allows changing an account that is not an active administrator", () => {
    expect(wouldRemoveLastActiveAdministrator({
      currentRole: "COMMUNITY",
      currentStatus: "ACTIVE",
      nextRole: "COMMUNITY",
      nextStatus: "SUSPENDED",
      activeAdministratorCount: 1,
    })).toBe(false);
  });
});

describe("restoration confirmation permissions", () => {
  it("allows an administrator or operator to confirm", () => {
    expect(canConfirmRestoration({ role: "ADMIN", reporterId: "a", userId: "b" })).toBe(true);
    expect(canConfirmRestoration({ role: "OPERATOR", reporterId: "a", userId: "b" })).toBe(true);
  });

  it("allows a community member to confirm only their own report", () => {
    expect(canConfirmRestoration({ role: "COMMUNITY", reporterId: "user-1", userId: "user-1" })).toBe(true);
    expect(canConfirmRestoration({ role: "COMMUNITY", reporterId: "user-1", userId: "user-2" })).toBe(false);
  });

  it("does not allow technicians to confirm restoration", () => {
    expect(canConfirmRestoration({ role: "TECHNICIAN", reporterId: "user-1", userId: "user-1" })).toBe(false);
  });
});
