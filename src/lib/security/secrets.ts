import { timingSafeEqual } from "node:crypto";

/** Validates a bearer header without leaking token comparisons through timing. */
export function isValidBearerSecret(authorization: string | null, expectedSecret: string | undefined): boolean {
  if (!expectedSecret || expectedSecret.length < 32 || !authorization?.startsWith("Bearer ")) return false;
  const expected = Buffer.from(expectedSecret);
  const supplied = Buffer.from(authorization.slice("Bearer ".length));
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
