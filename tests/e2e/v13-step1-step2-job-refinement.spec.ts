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

test("employer can refine a JD through chat, clear blockers, and advance review gating", async ({
  page
}) => {
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
  await expect(page.getByTestId("employer-job-detail-chat")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/v13-task16-step2-job-detail-created.png",
    fullPage: true
  });

  await expect(page.getByTestId("employer-job-review-button")).toBeDisabled();
  await expect(page.getByTestId("employer-job-publish-button")).toBeDisabled();

  await page
    .getByTestId("employer-job-chat-input")
    .fill("Use digital natives only language and remove the compensation band from the draft.");
  await page.getByTestId("employer-job-chat-submit").click();

  await expect(page.getByTestId("employer-job-chat-quality")).toContainText(
    "Review is currently blocked until critical quality failures are fixed."
  );
  await expect(page.getByTestId("employer-job-chat-memory")).toContainText(
    "Can you confirm the compensation band for this role?"
  );
  await expect(page.getByTestId("employer-job-review-warning")).toContainText(
    "Critical quality failures must be fixed before this job can move to review."
  );
  await expect(page.getByTestId("employer-job-review-button")).toBeDisabled();

  await page.screenshot({
    path: "tests/screenshots/v13-task16-step3-review-blocked-by-quality-failures.png",
    fullPage: true
  });

  await page
    .getByTestId("employer-job-chat-input")
    .fill("Fix the draft with inclusive language, restore compensation to $180k-$220k, and keep remote US.");
  await page.getByTestId("employer-job-chat-submit").click();

  await expect(page.getByTestId("employer-job-chat-quality")).toContainText(
    "No quality blockers detected."
  );
  await expect(page.getByTestId("employer-job-chat-memory")).toContainText(
    "No required follow-up questions right now."
  );
  await expect(page.getByTestId("employer-job-review-warning")).toHaveCount(0);
  await expect(page.getByTestId("employer-job-review-button")).toBeEnabled();
  await expect(page.getByTestId("employer-job-publish-button")).toBeDisabled();

  await page.screenshot({
    path: "tests/screenshots/v13-task16-step4-review-unblocked-after-fix.png",
    fullPage: true
  });

  await page.getByTestId("employer-job-review-button").click();
  await expect(page.getByText("Needs Review")).toBeVisible();
  await expect(page.getByTestId("employer-job-publish-button")).toBeEnabled();

  await page.screenshot({
    path: "tests/screenshots/v13-task16-step5-needs-review-publish-enabled.png",
    fullPage: true
  });
});
