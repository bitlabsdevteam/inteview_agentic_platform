import { expect, test } from "@playwright/test";

import { getEmployerCredentials, hasCredentials } from "./real-auth-env";

function hasSupabaseRuntimeEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

function isE2EStubModeEnabled() {
  return process.env.E2E_AGENT_STUB_MODE === "true";
}

test("employer job detail no longer renders the right-side rail", async ({ page }) => {
  const employerCredentials = getEmployerCredentials();

  test.skip(
    !hasSupabaseRuntimeEnv() ||
      !hasCredentials(employerCredentials) ||
      !isE2EStubModeEnabled(),
    "Requires Supabase runtime env, employer credentials, and E2E_AGENT_STUB_MODE=true."
  );

  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(employerCredentials.email!);
  await page.getByTestId("login-password-input").fill(employerCredentials.password!);
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/employer$/);

  await page.goto("/employer/jobs/new");
  await expect(page.getByTestId("employer-job-agent-form")).toBeVisible();

  await page.getByTestId("employer-job-prompt-composer").fill(
    "We need a senior AI platform engineer to own hiring workflow automation for remote US customers."
  );

  await page.screenshot({
    path: "tests/screenshots/v13-task16-step1-create-prompt-filled.png",
    fullPage: true
  });

  await page.getByTestId("employer-job-create-button").click();
  await expect(page).toHaveURL(/\/employer\/jobs\/[^/]+$/);
  await expect(page.getByTestId("employer-job-detail-form")).toBeVisible();
  await expect(page.getByTestId("employer-job-detail-chat")).toHaveCount(0);
  await expect(page.getByText("Session Memory")).toHaveCount(0);
  await expect(page.getByText("Review Checklist")).toHaveCount(0);
  await expect(page.getByText("Publish Controls")).toHaveCount(0);
  await expect(page.getByText("Archive And Remove")).toHaveCount(0);

  await page.screenshot({
    path: "tests/screenshots/v13-task16-step2-job-detail-created.png",
    fullPage: true
  });
});
