import { describe, expect, it } from "vitest";
import { isValidBearerSecret } from "@/lib/security/secrets";

const secret = "a-long-test-secret-that-is-at-least-32-characters";

describe("worker bearer authentication", () => {
  it("accepts the exact configured secret", () => {
    expect(isValidBearerSecret(`Bearer ${secret}`, secret)).toBe(true);
  });

  it("rejects absent, short, malformed and incorrect secrets", () => {
    expect(isValidBearerSecret(null, secret)).toBe(false);
    expect(isValidBearerSecret("Basic token", secret)).toBe(false);
    expect(isValidBearerSecret(`Bearer ${secret}`, undefined)).toBe(false);
    expect(isValidBearerSecret("Bearer short", "short")).toBe(false);
    expect(isValidBearerSecret(`Bearer ${secret}x`, secret)).toBe(false);
  });
});
