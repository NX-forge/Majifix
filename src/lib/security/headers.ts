/** Security headers shared by every route. Keep this policy in sync with deployed integrations. */
export function buildSecurityHeaders(isProduction: boolean): Record<string, string> {
  const scriptSources = ["'self'", "'unsafe-inline'", ...(!isProduction ? ["'unsafe-eval'"] : [])].join(" ");
  const connectSources = ["'self'", ...(!isProduction ? ["ws:", "wss:"] : [])].join(" ");
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  return {
    "Content-Security-Policy": contentSecurityPolicy,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Resource-Policy": "same-origin",
    ...(isProduction ? { "Strict-Transport-Security": "max-age=31536000" } : {}),
  };
}
