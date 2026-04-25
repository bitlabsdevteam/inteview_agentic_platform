import { expect, test } from "@playwright/test";
import { getEmployerCredentials, hasCredentials } from "./real-auth-env";

test("employer create-job page starts with a prompt-first agent composer", async ({ page }) => {
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

  await page.goto("/employer/jobs/new");
  await expect(page.getByRole("heading", { name: "Create a job with the agent" })).toBeVisible();
  await expect(page.getByTestId("employer-job-agent-form")).toBeVisible();
  await expect(page.getByTestId("employer-job-prompt-composer")).toBeVisible();
  await expect(page.getByTestId("employer-job-generated-state")).toBeVisible();
  await expect(page.getByTestId("employer-job-assumptions")).toBeVisible();
  await expect(page.getByTestId("employer-job-missing-fields")).toBeVisible();

  await expect(page.getByLabel("Department")).toHaveCount(0);
  await expect(page.getByLabel("Level")).toHaveCount(0);
  await expect(page.locator("input[required]")).toHaveCount(0);

  await page.screenshot({
    path: "tests/screenshots/v6-task8-step1-prompt-first-create-job.png",
    fullPage: true
  });

  await page.getByTestId("employer-job-prompt-composer").fill(
    "We need a senior product-minded AI engineer to own interview agent workflows for remote US customers."
  );

  await expect(page.getByTestId("employer-job-prompt-composer")).toHaveValue(
    "We need a senior product-minded AI engineer to own interview agent workflows for remote US customers."
  );
  await expect(page.getByTestId("employer-job-create-button")).toContainText("Generate Draft");

  await page.screenshot({
    path: "tests/screenshots/v6-task8-step2-prompt-filled.png",
    fullPage: true
  });
});
