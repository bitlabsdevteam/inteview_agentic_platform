import { expect, test } from "@playwright/test";
import { getEmployerCredentials, hasCredentials } from "./real-auth-env";

test("employer composer shows transient thinking messages with fade lifecycle during stream", async ({
  page
}) => {
  const employerCredentials = getEmployerCredentials();

  test.skip(
    !hasCredentials(employerCredentials),
    "Requires E2E_SUPABASE_EMPLOYER_EMAIL and E2E_SUPABASE_EMPLOYER_PASSWORD."
  );

  await page.route("**/api/employer/jobs/agent-stream", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream"
      },
      body: [
        'event: activity_status\ndata: {"message":"Streaming started."}\n\n',
        'event: activity_status\ndata: {"message":"Analyzing role scope."}\n\n',
        'event: activity_token\ndata: {"token":"Analyzing "}\n\n',
        'event: activity_token\ndata: {"token":"prompt"}\n\n'
      ].join("")
    });
  });

  await page.goto("/login");

  await page.getByTestId("login-email-input").fill(employerCredentials.email!);
  await page.getByTestId("login-password-input").fill(employerCredentials.password!);
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/employer$/);

  await page.goto("/employer/jobs/new");
  await expect(page.getByTestId("employer-job-agent-thinking-stream")).toBeVisible();
  await expect(page.getByTestId("employer-job-agent-stream-status")).toContainText(
    "Idle"
  );
  await expect(page.getByText("Agent Transparency")).toHaveCount(0);
  await expect(page.getByText("Reasoning Summary")).toHaveCount(0);
  await expect(page.getByText("Thinking Messages")).toHaveCount(0);

  await page.getByTestId("employer-job-prompt-composer").fill(
    "We need a senior AI product engineer to own job posting quality."
  );

  await page.screenshot({
    path: "tests/screenshots/v7-task7-step1-before-stream-submit.png",
    fullPage: true
  });

  await page.getByTestId("employer-job-create-button").click();
  await expect(page.getByTestId("employer-job-agent-stream-status")).toContainText(
    "Streaming"
  );
  await expect(page.getByTestId("employer-job-agent-transient-messages")).toBeVisible();
  await expect(page.getByTestId("employer-job-agent-transient-message").first()).toBeVisible();
  await expect(page.getByText("Analyzing role scope.")).toBeVisible();
  await expect(page.getByText("Streaming started.")).toHaveClass(
    /employer-job-agent__transient-message--fade-in/
  );

  await page.screenshot({
    path: "tests/screenshots/v7-task7-step2-streaming-state.png",
    fullPage: true
  });

  await page.waitForTimeout(1800);
  await expect(page.getByText("Streaming started.")).toHaveClass(
    /employer-job-agent__transient-message--fade-out/
  );

  await page.waitForTimeout(2300);
  await expect(page.getByTestId("employer-job-agent-transient-message")).toHaveCount(0);
  await expect(page.getByTestId("employer-job-agent-stream-status")).toContainText("Error");

  await page.screenshot({
    path: "tests/screenshots/v7-task7-step3-fade-cleared.png",
    fullPage: true
  });
});
