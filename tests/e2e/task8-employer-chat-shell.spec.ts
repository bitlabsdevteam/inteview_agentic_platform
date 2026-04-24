import { expect, test } from "@playwright/test";

test("employer login lands on the chat-agent workspace shell", async ({ page }) => {
  await page.goto("/login?mock-role=employer");

  await page.getByTestId("login-email-input").fill("employer@example.com");
  await page.getByTestId("login-password-input").fill("securepass123");
  await page.getByTestId("login-submit-button").click();

  await expect(page).toHaveURL(/\/employer$/);
  await expect(page.getByRole("heading", { name: "Employer agent workspace" })).toBeVisible();
  await expect(page.getByTestId("employer-chat-thread")).toBeVisible();
  await expect(page.getByTestId("employer-chat-composer")).toBeVisible();
  await expect(page.getByTestId("employer-workspace-board")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task8-step1-employer-chat-shell.png",
    fullPage: true
  });

  await page
    .getByTestId("employer-chat-composer")
    .fill("Draft a senior data engineer role focused on platform reliability.");

  await expect(page.getByTestId("employer-chat-composer")).toHaveValue(
    "Draft a senior data engineer role focused on platform reliability."
  );
  await expect(page.getByTestId("employer-signal-card")).toContainText("Role Brief");

  await page.screenshot({
    path: "tests/screenshots/task8-step2-employer-chat-composer-filled.png",
    fullPage: true
  });
});
