import { expect, test } from "@playwright/test";

import { getEmployerCredentials, hasCredentials } from "./real-auth-env";

function hasSupabaseRuntimeEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

test("anonymous access to employer candidate routes is denied", async ({ page }) => {
  test.skip(
    !hasSupabaseRuntimeEnv(),
    "Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for app runtime."
  );

  await page.goto("/employer/jobs/job-1/candidates");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("login-submit-button")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/v9-task10-step1-candidate-route-unauthorized-login.png",
    fullPage: true
  });
});

test("employer can open candidate intake workspace for an existing job", async ({ page }) => {
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
  test.skip((await firstJobAction.count()) === 0, "Requires at least one draft employer job.");

  const detailHref = await firstJobAction.getAttribute("href");
  if (!detailHref) {
    test.skip(true, "Unable to resolve job detail link.");
    return;
  }

  const candidateHref = `${detailHref}/candidates`;
  await page.goto(candidateHref);

  await expect(page.getByTestId("employer-candidate-intake-form")).toBeVisible();
  await expect(page.getByTestId("employer-candidates-list")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Candidate" })).toBeVisible();

  await page.getByLabel("Candidate name").fill("E2E Candidate");
  await page.getByLabel("Candidate email").fill("candidate@example.com");
  await page.getByLabel("Resume file name").fill("candidate.pdf");
  await page.getByLabel("Resume MIME type").fill("application/pdf");
  await page.getByLabel("Resume size bytes").fill("1024");
  await page.getByLabel("Resume/source text").fill(
    "Senior engineer with production TypeScript and recruiting workflow experience."
  );

  await expect(page.getByLabel("Candidate name")).toHaveValue("E2E Candidate");

  await page.screenshot({
    path: "tests/screenshots/v9-task10-step2-candidate-intake-workspace.png",
    fullPage: true
  });
});
