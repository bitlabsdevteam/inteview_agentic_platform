import { expect, test } from "@playwright/test";

test("job seeker login lands on the protected orientation shell", async ({ page }) => {
  await page.goto("/login?mock-role=job_seeker");

  await page.getByTestId("login-email-input").fill("jobseeker@example.com");
  await page.getByTestId("login-password-input").fill("securepass123");
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
