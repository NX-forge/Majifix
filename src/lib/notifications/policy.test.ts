import { describe, expect, it } from "vitest";
import { getNotificationRecipients, isNotificationCategoryEnabled } from "@/lib/notifications/policy";

describe("notification policy", () => {
  it("includes each relevant participant once and excludes the actor", () => {
    expect(getNotificationRecipients("reporter", "operator", "technician", "operator")).toEqual(["reporter", "technician"]);
    expect(getNotificationRecipients("same", "same", null)).toEqual(["same"]);
  });

  it("defaults missing category preferences to enabled", () => {
    expect(isNotificationCategoryEnabled(undefined, "FAULT_UPDATE")).toBe(true);
    expect(isNotificationCategoryEnabled({}, "RESTORATION")).toBe(true);
  });

  it("respects disabled category preferences", () => {
    expect(isNotificationCategoryEnabled({ assignments: false }, "ASSIGNMENT")).toBe(false);
    expect(isNotificationCategoryEnabled({ assignments: true }, "ASSIGNMENT")).toBe(true);
  });
});
