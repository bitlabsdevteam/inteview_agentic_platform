import { expect, test } from "@playwright/test";
import { getJobSeekerCredentials, hasCredentials } from "./real-auth-env";

test("job seeker login lands on the protected orientation shell", async ({ page }) => {
  const jobSeekerCredentials = getJobSeekerCredentials();

  test.skip(
    !hasCredentials(jobSeekerCredentials),
    "Requires E2E_SUPABASE_JOB_SEEKER_EMAIL and E2E_SUPABASE_JOB_SEEKER_PASSWORD."
  );

  await page.goto("/login");

  await page.getByTestId("login-email-input").fill(jobSeekerCredentials.email!);
  await page.getByTestId("login-password-input").fill(jobSeekerCredentials.password!);
  await page.getByTestId("login-submit-button").click();

  await expect(page).toHaveURL(/\/job-seeker$/);
  await expect(page.getByRole("heading", { name: "Job seeker workspace" })).toBeVisible();
  await expect(page.getByTestId("job-seeker-prep-card")).toBeVisible();
  await expect(page.getByTestId("job-seeker-focus-card")).toBeVisible();
  await expect(page.getByTestId("job-seeker-checklist")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task9-step1-job-seeker-landing.png",
    fullPage: true
  });

  await expect(page.getByTestId("job-seeker-focus-card")).toContainText("Interview Prep");
  await expect(page.getByTestId("job-seeker-checklist")).toContainText("Resume context");

  await page.screenshot({
    path: "tests/screenshots/task9-step2-job-seeker-landing-details.png",
    fullPage: true
  });
});
