import { expect, test } from "@playwright/test";

import {
  getEmployerCredentials,
  getJobSeekerCredentials,
  hasCredentials
} from "./real-auth-env";

function hasSupabaseRuntimeEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

test("employer candidate workspace supports filter and sort query controls", async ({ page }) => {
  const employerCredentials = getEmployerCredentials();

  test.skip(
    !hasSupabaseRuntimeEnv() || !hasCredentials(employerCredentials),
    "Requires Supabase runtime env plus E2E_SUPABASE_EMPLOYER_EMAIL and E2E_SUPABASE_EMPLOYER_PASSWORD."
  );

  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(employerCredentials.email!);
  await page.getByTestId("login-password-input").fill(employerCredentials.password!);
  await page.getByTestId("login-submit-button").click();

  await expect(page).toHaveURL(/\/employer$/);

  await page.goto("/employer/jobs");
  await expect(page.getByTestId("employer-jobs-list")).toBeVisible();

  const firstJobAction = page.getByTestId("employer-job-action-continue").first();
  test.skip((await firstJobAction.count()) === 0, "Requires at least one employer job.");

  const detailHref = await firstJobAction.getAttribute("href");
  if (!detailHref) {
    test.skip(true, "Unable to resolve job detail link.");
    return;
  }

  const workspaceHref = `${detailHref}/candidates`;
  await page.goto(workspaceHref);

  await expect(page.getByTestId("employer-candidate-filters")).toBeVisible();
  await expect(page.getByTestId("employer-candidates-list")).toBeVisible();

  await page.getByLabel("Status").selectOption("failed");
  await page.getByLabel("Skill").fill("TypeScript");
  await page.getByLabel("Min confidence").fill("0.75");
  await page.getByLabel("Sort").selectOption("aggregate_score_desc");
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page).toHaveURL(/status=failed/);
  await expect(page).toHaveURL(/skill=TypeScript/);
  await expect(page).toHaveURL(/minConfidence=0.75/);
  await expect(page).toHaveURL(/sortBy=aggregate_score_desc/);

  await page.screenshot({
    path: "tests/screenshots/v10-task10-step1-candidate-workspace-filter-sort.png",
    fullPage: true
  });
});

test("job seeker is denied employer candidate retry routes and redirected", async ({ page }) => {
  const jobSeekerCredentials = getJobSeekerCredentials();

  test.skip(
    !hasSupabaseRuntimeEnv() || !hasCredentials(jobSeekerCredentials),
    "Requires Supabase runtime env plus E2E_SUPABASE_JOB_SEEKER_EMAIL and E2E_SUPABASE_JOB_SEEKER_PASSWORD."
  );

  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(jobSeekerCredentials.email!);
  await page.getByTestId("login-password-input").fill(jobSeekerCredentials.password!);
  await page.getByTestId("login-submit-button").click();

  await expect(page).toHaveURL(/\/job-seeker$/);

  await page.goto(
    "/employer/jobs/job-1/candidates?status=failed&skill=TypeScript&minConfidence=0.8&sortBy=aggregate_score_desc"
  );

  await expect(page).toHaveURL(/\/job-seeker$/);

  await page.screenshot({
    path: "tests/screenshots/v10-task10-step2-retry-route-denied-job-seeker.png",
    fullPage: true
  });
});
