import { expect, test } from "@playwright/test";
import { getJobSeekerSignupCredentials, hasCredentials } from "./real-auth-env";

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
  const signupCredentials = getJobSeekerSignupCredentials();

  test.skip(
    !hasCredentials(signupCredentials),
    "Requires E2E_SUPABASE_SIGNUP_JOB_SEEKER_EMAIL and E2E_SUPABASE_SIGNUP_JOB_SEEKER_PASSWORD."
  );

  await page.goto("/register?role=job_seeker");

  await page.getByTestId("register-email-input").fill(signupCredentials.email!);
  await page.getByTestId("register-password-input").fill(signupCredentials.password!);
  await page.getByTestId("register-confirm-password-input").fill(signupCredentials.password!);
  await page.getByTestId("register-submit-button").click();

  await expect(page).toHaveURL(/\/job-seeker$/);
  await expect(page.getByTestId("job-seeker-focus-card")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task4-step4-register-success.png",
    fullPage: true
  });
});
