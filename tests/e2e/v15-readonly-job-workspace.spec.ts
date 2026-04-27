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

test("employer reviews a read-only artifact and revises it from chat with Enter", async ({
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
    "We need a senior AI platform engineer to own employer recruiting workflow quality for remote US customers."
  );
  await page.getByTestId("employer-job-create-button").click();

  await expect(page).toHaveURL(/\/employer\/jobs\/[^/]+$/);
  await expect(page.getByTestId("employer-job-readonly-workspace")).toBeVisible();
  await expect(page.getByTestId("employer-job-assistant-window")).toBeVisible();
  await expect(page.getByTestId("employer-job-assistant-window")).toHaveAttribute(
    "data-assistant-mode",
    "refine"
  );
  await expect(page.getByTestId("employer-job-detail-chat")).toBeVisible();
  await expect(page.getByTestId("employer-job-detail-chat-rail")).toHaveCount(0);
  await expect(page.getByTestId("employer-job-detail-pipeline")).toHaveCount(0);
  await expect(page.getByTestId("employer-interview-blueprint-panel")).toHaveCount(0);
  await expect(page.getByTestId("employer-job-readonly-workspace")).toContainText(
    "Read-Only Generated Artifact"
  );
  await expect(page.getByTestId("employer-job-readonly-workspace")).toContainText(
    "Role Profile Summary"
  );
  await expect(page.getByTestId("employer-job-readonly-workspace")).toContainText(
    "Generated Job Posting"
  );
  await expect(page.getByTestId("employer-job-readonly-workspace")).toContainText(
    "Interview Structure Summary"
  );
  await expect(page.getByTestId("employer-job-readonly-workspace")).toContainText(
    "Review Notes"
  );
  await expect(page.getByTestId("employer-job-readonly-workspace")).toContainText(
    "clear written communication with employers"
  );
  await expect(page.getByTestId("employer-job-detail-chat")).not.toContainText("Session Memory");
  await expect(page.getByTestId("employer-job-detail-chat")).not.toContainText(
    "Role Profile Summary"
  );
  await expect(page.getByTestId("employer-job-detail-chat")).not.toContainText(
    "Quality Warnings"
  );
  await expect(page.getByTestId("employer-job-chat-submit")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/v15-task9-step1-readonly-workspace-with-popup-agent.png",
    fullPage: true
  });

  const chatInput = page.getByTestId("employer-job-chat-input");
  await chatInput.fill(
    "Use inclusive language and restore compensation while updating the requirements for distributed teams."
  );
  await chatInput.press("Enter");

  await expect(chatInput).toHaveValue("");
  await expect(page.getByTestId("employer-job-readonly-workspace")).toContainText(
    "clear written communication with distributed teams"
  );
  await expect(page.getByTestId("employer-job-readonly-workspace")).toContainText(
    "inclusive, skill-based language"
  );
  await expect(page.getByTestId("employer-job-readonly-workspace")).not.toContainText(
    "clear written communication with employers"
  );
  await expect(page.getByTestId("employer-job-detail-chat")).toContainText(
    "Use inclusive language and restore compensation while updating the requirements for distributed teams."
  );

  await page.screenshot({
    path: "tests/screenshots/v15-task9-step2-popup-agent-revised-artifact.png",
    fullPage: true
  });
});
