import { expect, test } from "@playwright/test";

test("registration surfaces password mismatch before trying to create the account", async ({
  page
}) => {
  await page.goto("/register?role=employer");

  await page.getByTestId("register-email-input").fill("employer@example.com");
  await page.getByTestId("register-password-input").fill("securepass123");
  await page.getByTestId("register-confirm-password-input").fill("differentpass123");

  await page.screenshot({
    path: "tests/screenshots/task4-step1-register-mismatch-input.png",
    fullPage: true
  });

  await page.getByTestId("register-submit-button").click();

  await expect(page.getByTestId("register-form-feedback")).toContainText("Passwords must match.");

  await page.screenshot({
    path: "tests/screenshots/task4-step2-register-mismatch-error.png",
    fullPage: true
  });
});

test("registration shows auth errors and success messages for email signup", async ({ page }) => {
  await page.goto("/register?role=job_seeker");

  await page.getByTestId("register-email-input").fill("already-taken@example.com");
  await page.getByTestId("register-password-input").fill("securepass123");
  await page.getByTestId("register-confirm-password-input").fill("securepass123");

  await page.getByTestId("register-submit-button").click();

  await expect(page.getByTestId("register-form-feedback")).toContainText(
    "An account with this email already exists."
  );

  await page.screenshot({
    path: "tests/screenshots/task4-step3-register-auth-error.png",
    fullPage: true
  });

  await page.getByTestId("register-email-input").fill("new-job-seeker@example.com");
  await page.getByTestId("register-password-input").fill("securepass123");
  await page.getByTestId("register-confirm-password-input").fill("securepass123");
  await page.getByTestId("register-submit-button").click();

  await expect(page.getByTestId("register-form-feedback")).toContainText(
    "Account created for Job Seeker. Check your email to continue."
  );

  await page.screenshot({
    path: "tests/screenshots/task4-step4-register-success.png",
    fullPage: true
  });
});
