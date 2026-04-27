import { expect, test } from "@playwright/test";
import { getEmployerCredentials, hasCredentials } from "./real-auth-env";

test.describe("job agent stream behavior", () => {
  test("renders token stream updates during successful SSE flow", async ({ page }) => {
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
          'event: activity_token\ndata: {"token":"{\\"thinkingMessages\\":[\\"Analyzing "}\n\n',
          'event: activity_token\ndata: {"token":"prompt context\\"],\\"actionLog\\":[\\"Prepared draft\\"]}"}\n\n'
        ].join("")
      });
    });

    await page.goto("/login");
    await page.getByTestId("login-email-input").fill(employerCredentials.email!);
    await page.getByTestId("login-password-input").fill(employerCredentials.password!);
    await page.getByTestId("login-submit-button").click();
    await expect(page).toHaveURL(/\/employer$/);

    await page.goto("/employer/jobs/new");
    await expect(page.getByText("Agent Transparency")).toHaveCount(0);
    await expect(page.getByText("Reasoning Summary")).toHaveCount(0);
    await expect(page.getByText("Thinking Messages")).toHaveCount(0);
    await page.getByTestId("employer-job-prompt-composer").fill(
      "Need a senior AI engineer for interview workflow quality."
    );
    await page.getByTestId("employer-job-create-button").click();

    await expect(page.getByTestId("employer-job-agent-stream-status")).toContainText("Streaming");
    await expect(page.getByTestId("employer-job-agent-stream-output")).toContainText(
      "Analyzing prompt context"
    );
    await expect(page.getByTestId("employer-job-agent-stream-output")).not.toContainText(
      "thinkingMessages"
    );
    await expect(page.getByTestId("employer-job-agent-stream-output")).not.toContainText(
      "{"
    );
    await expect(page.getByText("Streaming started.")).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/v7-task8-step1-stream-success.png",
      fullPage: true
    });
  });

  test("shows error state when SSE stream returns provider failure event", async ({ page }) => {
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
        body: 'event: error\ndata: {"message":"Unable to generate a draft right now. Please try again."}\n\n'
      });
    });

    await page.goto("/login");
    await page.getByTestId("login-email-input").fill(employerCredentials.email!);
    await page.getByTestId("login-password-input").fill(employerCredentials.password!);
    await page.getByTestId("login-submit-button").click();
    await expect(page).toHaveURL(/\/employer$/);

    await page.goto("/employer/jobs/new");
    await expect(page.getByText("Agent Transparency")).toHaveCount(0);
    await expect(page.getByText("Reasoning Summary")).toHaveCount(0);
    await expect(page.getByText("Thinking Messages")).toHaveCount(0);
    await page.getByTestId("employer-job-prompt-composer").fill(
      "Need a senior AI engineer for interview workflow quality."
    );
    await page.getByTestId("employer-job-create-button").click();

    await expect(page.getByTestId("employer-job-agent-stream-status")).toContainText("Error");
    await expect(
      page.getByText("Unable to generate a draft right now. Please try again.")
    ).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/v7-task8-step2-stream-error.png",
      fullPage: true
    });
  });
});
