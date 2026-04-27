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

test("employer can complete the staged job-posting pipeline from draft to review", async ({
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
  await expect(page.getByTestId("employer-job-assistant-window")).toBeVisible();
  await expect(page.getByTestId("employer-job-assistant-window")).toHaveAttribute(
    "data-assistant-mode",
    "create"
  );
  await page.getByTestId("employer-job-assistant-toggle").click();
  await expect(page.getByTestId("employer-job-assistant-window")).toHaveAttribute(
    "data-collapsed",
    "true"
  );
  await page.getByTestId("employer-job-assistant-toggle").click();
  await page.getByTestId("employer-job-prompt-composer").fill(
    "We need a senior AI platform engineer to own employer recruiting workflow quality for remote US customers."
  );

  await page.screenshot({
    path: "tests/screenshots/v14-task18-step1-job-prompt-filled.png",
    fullPage: true
  });

  await page.getByTestId("employer-job-create-button").click();
  await expect(page).toHaveURL(/\/employer\/jobs\/[^/]+$/);

  await expect(page.getByTestId("employer-job-detail-pipeline")).toBeVisible();
  await expect(page.getByTestId("employer-job-assistant-window")).toBeVisible();
  await expect(page.getByTestId("employer-job-assistant-window")).toHaveAttribute(
    "data-assistant-mode",
    "refine"
  );
  await expect(page.getByTestId("employer-job-stage-panel-interview_structure")).toBeVisible();
  await expect(page.getByTestId("employer-interview-blueprint-panel")).toBeVisible();
  await expect(page.locator('[data-stage-key="job_posting"]')).toContainText("Build Job Posting");
  await expect(page.locator('[data-stage-key="interview_structure"]')).toContainText(
    "Design Interview Structure"
  );
  await expect(page.locator('[data-stage-key="review"]')).toContainText("Review And Approve");
  await expect(page.getByTestId("employer-job-review-button")).toBeDisabled();

  await page.screenshot({
    path: "tests/screenshots/v14-task18-step2-stage2-panel-visible.png",
    fullPage: true
  });

  await page.locator('input[name="title"]').fill("Platform Engineer Interview Plan");
  await page
    .locator('textarea[name="objective"]')
    .fill("Assess architecture ownership, delivery judgment, and communication quality.");
  await page.locator('select[name="responseMode"]').selectOption("voice_agent");
  await page.locator('select[name="toneProfile"]').selectOption("high-precision");
  await page.locator('select[name="parsingStrategy"]').selectOption("hybrid");
  await page
    .locator('textarea[name="benchmarkSummary"]')
    .fill(
      "Advance candidates who show concrete ownership examples, clear tradeoff reasoning, and strong debugging communication."
    );
  await page
    .locator('textarea[name="approvalNotes"]')
    .fill("Employer review required before candidate-facing activation.");
  await page
    .locator('input[name="stageLabel_0"]')
    .fill("Technical Deep Dive");
  await page
    .locator('textarea[name="questionText_0_0"]')
    .fill("How would you design a resilient pipeline for high-volume employer events?");
  await page
    .locator('textarea[name="intent_0_0"]')
    .fill("Evaluate architecture depth and operational judgment.");
  await page.locator('input[name="evaluationFocus_0_0"]').fill("System design");
  await page
    .locator('textarea[name="strongSignal_0_0"]')
    .fill("Explains scaling, failure modes, and monitoring choices.");
  await page
    .locator('textarea[name="failureSignal_0_0"]')
    .fill("Focuses only on happy-path implementation details.");
  await page
    .locator('textarea[name="followUpPrompt_0_0"]')
    .fill("Where would you expect the first bottleneck to appear?");

  await page.getByRole("button", { name: "Save Interview Structure" }).click();
  await expect(page).toHaveURL(/\/employer\/jobs\/[^/]+$/);
  await expect(page.getByTestId("employer-interview-blueprint-panel")).toBeVisible();
  await expect(page.getByTestId("employer-job-review-button")).toBeEnabled();
  await expect(page.getByTestId("employer-job-review-warning")).toHaveCount(0);

  await page.screenshot({
    path: "tests/screenshots/v14-task18-step3-stage2-complete-review-enabled.png",
    fullPage: true
  });

  await page.getByTestId("employer-job-review-button").click();
  await expect(page.getByText("Needs Review")).toBeVisible();
  await expect(page.getByTestId("employer-job-publish-button")).toBeEnabled();

  await page.screenshot({
    path: "tests/screenshots/v14-task18-step4-needs-review-publish-enabled.png",
    fullPage: true
  });
});
