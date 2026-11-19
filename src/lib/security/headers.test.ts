import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "@/lib/security/headers";

describe("application security headers", () => {
  it("sets restrictive browser security headers in every environment", () => {
    const headers = buildSecurityHeaders(false);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  });

  it("enables HSTS and blocks eval in production", () => {
    const headers = buildSecurityHeaders(true);
    expect(headers["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(headers["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
    expect(headers["Content-Security-Policy"]).not.toContain("unsafe-eval");
  });

  it("allows local Next.js development tooling without weakening production", () => {
    const headers = buildSecurityHeaders(false);
    expect(headers["Content-Security-Policy"]).toContain("'unsafe-eval'");
    expect(headers["Content-Security-Policy"]).toContain("ws:");
    expect(buildSecurityHeaders(true)["Content-Security-Policy"]).not.toContain("ws:");
  });
});
