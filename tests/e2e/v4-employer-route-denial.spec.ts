import { expect, test } from "@playwright/test";
import { getEmployerCredentials, hasCredentials } from "./real-auth-env";

test("employer direct access to job seeker route redirects back to employer workspace", async ({
  page
}) => {
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
  await expect(page.getByTestId("employer-workspace-board")).toBeVisible();

  await page.goto("/job-seeker");

  await expect(page).toHaveURL(/\/employer$/);
  await expect(page.getByTestId("employer-workspace-board")).toBeVisible();
  await expect(page.getByTestId("account-header-nav-employer")).toBeVisible();
  await expect(page.getByTestId("account-header-nav-job-seeker")).toHaveCount(0);
  await expect(page.getByTestId("job-seeker-prep-card")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Job seeker workspace" })).toHaveCount(0);

  await page.screenshot({
    path: "tests/screenshots/v4-task10-employer-route-denial.png",
    fullPage: true
  });
});
