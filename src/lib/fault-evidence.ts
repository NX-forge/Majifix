export const MAX_FAULT_EVIDENCE_BYTES = 4 * 1024 * 1024;

const MIME_BY_SIGNATURE = [
  { mimeType: "image/jpeg", matches: (bytes: Uint8Array) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { mimeType: "image/png", matches: (bytes: Uint8Array) => bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value) },
  { mimeType: "image/webp", matches: (bytes: Uint8Array) => bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" },
  { mimeType: "application/pdf", matches: (bytes: Uint8Array) => bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-" },
] as const;

export type ValidatedFaultEvidence = {
  originalName: string;
  mimeType: (typeof MIME_BY_SIGNATURE)[number]["mimeType"];
  sizeBytes: number;
  data: Uint8Array;
};

/** Validate file size and inspect its signature instead of trusting browser MIME. */
export async function validateFaultEvidence(value: FormDataEntryValue | null): Promise<ValidatedFaultEvidence | null> {
  if (value === null || typeof value === "string") return null;
  if (value.size === 0) {
    if (value.name) throw new Error("EVIDENCE_EMPTY");
    return null;
  }
  if (value.size > MAX_FAULT_EVIDENCE_BYTES) throw new Error("EVIDENCE_TOO_LARGE");

  const data = new Uint8Array(await value.arrayBuffer());
  const detected = MIME_BY_SIGNATURE.find((entry) => entry.matches(data));
  if (!detected) throw new Error("UNSUPPORTED_EVIDENCE_TYPE");

  const originalName = value.name
    .replace(/[/\\]/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 120) || "evidence";

  return { originalName, mimeType: detected.mimeType, sizeBytes: data.byteLength, data };
}
