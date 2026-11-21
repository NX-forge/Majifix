import { describe, expect, it } from "vitest";
import { validateProductionEnvironment } from "../../../scripts/production-env.mjs";

const validEnvironment = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://neondb_owner:npg_2NR8nVFWKbAO@ep-bold-heart-bev3zze0-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  BETTER_AUTH_SECRET: "dDIn63zhURPHBl8UcOQgxaR+fADGq06064JVZUHZxW0=",
  NOTIFICATION_WORKER_SECRET: "RPKVpyxCAoRKwoeay+3VzbVYq9F25ipqO4ZayTaHdjA=",
  BETTER_AUTH_URL: "https://majifix.example.ke",
  NEXT_PUBLIC_APP_URL: "https://majifix.example.ke",
  RESEND_API_KEY: "re_live_validlookingkey",
  RESEND_FROM_EMAIL: "MajiFix <no-reply@majifix.example.ke>",
} as const;

describe("production environment validation", () => {
  it("accepts a complete secure production environment", () => expect(validateProductionEnvironment(validEnvironment)).toEqual([]));
  it("rejects missing configuration", () => expect(validateProductionEnvironment({
    NODE_ENV: "production"
  })).toHaveLength(8));
  it("rejects localhost and PostgreSQL URLs without TLS", () => {
    const errors = validateProductionEnvironment({ ...validEnvironment, DATABASE_URL: "postgresql://localhost:5432/neondb" });
    expect(errors).toContain("DATABASE_URL must point to a managed or remote production database, not localhost.");
    expect(errors).toContain("DATABASE_URL must enable TLS (for Neon, use sslmode=require).");
  });
  it("rejects mismatched application origins", () => {
    const errors = validateProductionEnvironment({ ...validEnvironment, NEXT_PUBLIC_APP_URL: "https://www.majifix.example.ke" });
    expect(errors).toContain("BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL must use the same canonical origin.");
  });
  it("rejects placeholder and weak secrets", () => {
    const errors = validateProductionEnvironment({ ...validEnvironment, BETTER_AUTH_SECRET: "replace-with-a-long-placeholder-secret-value", NOTIFICATION_WORKER_SECRET: "short" });
    expect(errors.some((error) => error.includes("BETTER_AUTH_SECRET"))).toBe(true);
    expect(errors.some((error) => error.includes("NOTIFICATION_WORKER_SECRET"))).toBe(true);
  });
});
