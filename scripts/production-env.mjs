import { pathToFileURL } from "node:url";
import dotenv from "dotenv";

// Load the deployment-host template for local preflight runs. Injected host
// environment variables take precedence over values in the file.
dotenv.config({ path: process.env.MAJIFIX_ENV_FILE ?? ".env.production", override: false, quiet: true });

const PLACEHOLDER_PATTERNS = [/replace[-_ ]?with/i, /change[-_ ]?this/i, /your[-_ ]/i, /placeholder/i, /example\.(com|invalid)/i, /\.\.\./];
const isPlaceholder = (value) => PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));

function parseHttpsOrigin(value, name, errors) {
  if (!value) { errors.push(`${name} is required.`); return null; }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") errors.push(`${name} must use HTTPS in production.`);
    if (url.username || url.password) errors.push(`${name} must not contain credentials.`);
    if (url.pathname !== "/" || url.search || url.hash) errors.push(`${name} must be an origin without a path, query, or fragment.`);
    return url;
  } catch { errors.push(`${name} must be a valid absolute URL.`); return null; }
}

export function validateProductionEnvironment(env = process.env) {
  const errors = [];
  const databaseUrl = env.DATABASE_URL?.trim() ?? "";
  const authSecret = env.BETTER_AUTH_SECRET?.trim() ?? "";
  const workerSecret = env.NOTIFICATION_WORKER_SECRET?.trim() ?? "";
  const resendKey = env.RESEND_API_KEY?.trim() ?? "";
  const resendFrom = env.RESEND_FROM_EMAIL?.trim() ?? "";

  if (!databaseUrl) errors.push("DATABASE_URL is required.");
  else {
    try {
      const database = new URL(databaseUrl);
      if (!["postgres:", "postgresql:"].includes(database.protocol)) errors.push("DATABASE_URL must use PostgreSQL.");
      if (["localhost", "127.0.0.1", "::1"].includes(database.hostname)) errors.push("DATABASE_URL must point to a managed or remote production database, not localhost.");
      const sslMode = database.searchParams.get("sslmode");
      const ssl = database.searchParams.get("ssl");
      if (!["require", "verify-ca", "verify-full"].includes(sslMode) && ssl !== "true") errors.push("DATABASE_URL must enable TLS (for Neon, use sslmode=require).");
    } catch { errors.push("DATABASE_URL must be a valid PostgreSQL connection URL."); }
  }
  if (authSecret.length < 32 || isPlaceholder(authSecret)) errors.push("BETTER_AUTH_SECRET must be a unique, non-placeholder secret of at least 32 characters.");
  if (workerSecret.length < 32 || isPlaceholder(workerSecret)) errors.push("NOTIFICATION_WORKER_SECRET must be a unique, non-placeholder secret of at least 32 characters.");

  const authUrl = parseHttpsOrigin(env.BETTER_AUTH_URL?.trim(), "BETTER_AUTH_URL", errors);
  const appUrl = parseHttpsOrigin(env.NEXT_PUBLIC_APP_URL?.trim(), "NEXT_PUBLIC_APP_URL", errors);
  if (authUrl && appUrl && authUrl.origin !== appUrl.origin) errors.push("BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL must use the same canonical origin.");
  if (!resendKey.startsWith("re_") || isPlaceholder(resendKey)) errors.push("RESEND_API_KEY must be a valid, non-placeholder Resend API key.");
  if (!resendFrom || !resendFrom.includes("@") || isPlaceholder(resendFrom)) errors.push("RESEND_FROM_EMAIL must be an address or sender identity on your verified domain.");
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = validateProductionEnvironment();
  if (errors.length) {
    console.error("MajiFix production configuration is incomplete:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else console.log("MajiFix production environment checks passed.");
}
