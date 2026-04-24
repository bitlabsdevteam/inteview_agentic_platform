import { expect, test } from "@playwright/test";
import { getEmployerCredentials, hasCredentials } from "./real-auth-env";

test("login shows recovery guidance, Google sign-in, and email/password errors", async ({
  page
}) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Sign back in and recover the right workspace" })).toBeVisible();
  await expect(page.getByTestId("login-google-submit-button")).toBeVisible();
  await expect(page.getByTestId("login-recovery-link")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task6-step1-login-initial.png",
    fullPage: true
  });

  await page.getByTestId("login-email-input").fill("candidate@example.com");
  await page.getByTestId("login-password-input").fill("wrong-password");
  await page.getByTestId("login-submit-button").click();

  await expect(page.getByTestId("login-form-feedback")).toContainText(
    "The email or password is incorrect."
  );

  await page.screenshot({
    path: "tests/screenshots/task6-step2-login-invalid-credentials.png",
    fullPage: true
  });
});

test("login redirects the user to the saved employer workspace", async ({ page }) => {
  const employerCredentials = getEmployerCredentials();

  test.skip(
    !hasCredentials(employerCredentials),
    "Requires E2E_SUPABASE_EMPLOYER_EMAIL and E2E_SUPABASE_EMPLOYER_PASSWORD."
  );

  await page.goto("/login");

  await page.getByTestId("login-email-input").fill(employerCredentials.email!);
  await page.getByTestId("login-password-input").fill(employerCredentials.password!);
  await page.getByTestId("login-submit-button").click();

  await expect(page).toHaveURL(/\/employer$/);
  await expect(page.getByRole("heading", { name: "Employer agent workspace" })).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task6-step3-login-employer-success.png",
    fullPage: true
  });
});
