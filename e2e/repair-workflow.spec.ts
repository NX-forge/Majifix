import { expect, test, type Browser, type Page } from "@playwright/test";

const faultId = process.env.E2E_WORKFLOW_FAULT_ID;
const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
const technician = { email: process.env.E2E_TECHNICIAN_EMAIL, password: process.env.E2E_TECHNICIAN_PASSWORD };
const technicianName = process.env.E2E_TECHNICIAN_NAME;
const community = { email: process.env.E2E_COMMUNITY_EMAIL, password: process.env.E2E_COMMUNITY_PASSWORD };

async function createSignedInPage(browser: Browser, credentials: { email?: string; password?: string }): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email address").fill(credentials.email!);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return { page, close: () => context.close() };
}

test("fault moves from approval through assignment, repair and community restoration confirmation", async ({ browser }) => {
  test.setTimeout(120_000);
  test.skip(
    !faultId || !admin.email || !admin.password || !technician.email || !technician.password || !technicianName || !community.email || !community.password,
    "Set E2E_WORKFLOW_FAULT_ID and dedicated admin, technician and original-reporter credentials to run the full workflow.",
  );

  const adminSession = await createSignedInPage(browser, admin);
  const technicianSession = await createSignedInPage(browser, technician);
  const communitySession = await createSignedInPage(browser, community);

  try {
    const faultUrl = `/faults/${faultId}`;

    await adminSession.page.goto(faultUrl);
    await adminSession.page.locator("#assessmentNotes").fill("E2E approval: water point and repair need have been reviewed.");
    await adminSession.page.getByRole("button", { name: "Approve repair" }).click();
    await expect(adminSession.page.locator("#technicianId")).toBeVisible();

    const technicianOption = adminSession.page.locator("#technicianId option").filter({ hasText: technicianName! }).first();
    const technicianId = await technicianOption.getAttribute("value");
    expect(technicianId).toBeTruthy();
    await adminSession.page.locator("#technicianId").selectOption(technicianId!);
    await adminSession.page.getByRole("button", { name: "Assign technician" }).click();

    await technicianSession.page.goto(faultUrl);
    await technicianSession.page.getByRole("button", { name: "Accept assignment" }).click();
    await technicianSession.page.goto(faultUrl);
    await technicianSession.page.locator("#nextStatus").selectOption("IN_PROGRESS");
    await technicianSession.page.locator("#repairNotes").fill("E2E repair started and work is underway.");
    await technicianSession.page.getByRole("button", { name: "Save update" }).click();

    await technicianSession.page.locator("#nextStatus").selectOption("REPAIR_COMPLETED");
    await technicianSession.page.locator("#repairNotes").fill("E2E repair work completed. Requesting restoration confirmation.");
    await technicianSession.page.getByRole("button", { name: "Save update" }).click();

    await adminSession.page.goto(faultUrl);
    await adminSession.page.locator("#nextStatus").selectOption("AWAITING_CONFIRMATION");
    await adminSession.page.locator("#repairNotes").fill("E2E handover: repair is ready for community service verification.");
    await adminSession.page.getByRole("button", { name: "Save update" }).click();

    await communitySession.page.goto(faultUrl);
    await communitySession.page.locator("#result").selectOption("WATER_RESTORED");
    await communitySession.page.locator("#confirmationNotes").fill("E2E verification: water is flowing and the service is usable.");
    await communitySession.page.getByRole("button", { name: "Submit confirmation" }).click();
    await expect(communitySession.page.getByText("RESTORED", { exact: true }).first()).toBeVisible();
  } finally {
    await Promise.all([adminSession.close(), technicianSession.close(), communitySession.close()]);
  }
});
