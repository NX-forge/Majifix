import { describe, expect, it } from "vitest";
import { MAX_FAULT_EVIDENCE_BYTES, validateFaultEvidence } from "@/lib/fault-evidence";

describe("fault evidence validation", () => {
  it("accepts a PNG based on its file signature", async () => {
    const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
    const file = new File([signature], "borehole-photo.png", { type: "application/octet-stream" });
    const result = await validateFaultEvidence(file);
    expect(result?.mimeType).toBe("image/png");
    expect(result?.originalName).toBe("borehole-photo.png");
    expect(result?.sizeBytes).toBe(signature.length);
  });

  it("rejects an empty selected file", async () => {
    const file = new File([], "empty.png", { type: "image/png" });
    await expect(validateFaultEvidence(file)).rejects.toThrow("EVIDENCE_EMPTY");
  });

  it("rejects a file whose claimed MIME type does not match an allowed signature", async () => {
    const file = new File(["not a PDF"], "report.pdf", { type: "application/pdf" });
    await expect(validateFaultEvidence(file)).rejects.toThrow("UNSUPPORTED_EVIDENCE_TYPE");
  });

  it("rejects files larger than the configured limit", async () => {
    const file = new File([new Uint8Array(MAX_FAULT_EVIDENCE_BYTES + 1)], "large.png", { type: "image/png" });
    await expect(validateFaultEvidence(file)).rejects.toThrow("EVIDENCE_TOO_LARGE");
  });

  it("sanitises uploaded filenames", async () => {
    const signature = new Uint8Array([255, 216, 255, 0]);
    const file = new File([signature], "../../pump photo.jpg", { type: "image/jpeg" });
    const result = await validateFaultEvidence(file);
    expect(result?.originalName).not.toContain("/");
    expect(result?.originalName).not.toContain(" ");
  });
});
