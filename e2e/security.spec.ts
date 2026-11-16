import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const communityEmail = process.env.E2E_COMMUNITY_EMAIL;
const communityPassword = process.env.E2E_COMMUNITY_PASSWORD;

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("unauthenticated users are redirected away from protected pages", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("notification dispatcher rejects requests without its worker secret", async ({ request }) => {
  const response = await request.post("/api/notifications/dispatch");
  expect(response.status()).toBe(401);
});

test("administrator can access team administration", async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run this role test.");
  await signIn(page, adminEmail!, adminPassword!);
  await page.goto("/team");
  await expect(page.getByRole("heading", { name: "Team access" })).toBeVisible();
});

test("community users cannot access team administration", async ({ page }) => {
  test.skip(!communityEmail || !communityPassword, "Set E2E_COMMUNITY_EMAIL and E2E_COMMUNITY_PASSWORD to run this role test.");
  await signIn(page, communityEmail!, communityPassword!);
  await page.goto("/team");
  await expect(page).toHaveURL(/\/dashboard\?error=forbidden/);
});
