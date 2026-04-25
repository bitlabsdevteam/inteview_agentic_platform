import { expect, test } from "@playwright/test";
import { getEmployerCredentials, hasCredentials } from "./real-auth-env";

test("employer login shows employer-only top menu and logout controls", async ({ page }) => {
  const employerCredentials = getEmployerCredentials();

  test.skip(
    !hasCredentials(employerCredentials),
    "Requires E2E_SUPABASE_EMPLOYER_EMAIL and E2E_SUPABASE_EMPLOYER_PASSWORD."
  );

  await page.goto("/login");

  await page.getByTestId("login-email-input").fill(employerCredentials.email!);
  await page.getByTestId("login-password-input").fill(employerCredentials.password!);
  await page.getByTestId("login-submit-button").click();

  await expect(page).toHaveURL(/\/employer$/);
  await expect(page.getByTestId("account-header")).toBeVisible();
  await expect(page.getByTestId("account-header-primary-nav")).toBeVisible();
  await expect(page.getByTestId("account-header-nav-home")).toBeVisible();
  await expect(page.getByTestId("account-header-nav-employer")).toBeVisible();
  await expect(page.getByTestId("account-header-nav-job-seeker")).toHaveCount(0);
  await expect(page.getByTestId("account-header-nav-login")).toHaveCount(0);
  await expect(page.getByTestId("account-header-nav-register")).toHaveCount(0);
  await expect(page.getByTestId("account-header-profile")).toContainText("Employer");
  await expect(page.getByTestId("account-header-logout-button")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/v4-task9-employer-menu-isolation.png",
    fullPage: true
  });
});
