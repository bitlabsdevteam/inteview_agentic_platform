import { expect, test } from "@playwright/test";

test("landing employer entry pre-fills registration and Google signup reaches the employer workspace", async ({
  page
}) => {
  await page.goto("/");

  await page.getByTestId("landing-employer-entry-link").click();
  await expect(page).toHaveURL(/\/register\?role=employer$/);
  await expect(page.getByTestId("register-role-input-employer")).toBeChecked();

  await page.screenshot({
    path: "tests/screenshots/task10-step1-employer-entry-register.png",
    fullPage: true
  });

  await page.getByTestId("register-google-submit-button").click();

  await expect(page).toHaveURL(/\/employer$/);
  await expect(page.getByTestId("employer-workspace-board")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task10-step2-employer-google-destination.png",
    fullPage: true
  });
});

test("landing job seeker entry pre-fills registration and email signup succeeds", async ({
  page
}) => {
  await page.goto("/");

  await page.getByTestId("landing-job-seeker-entry-link").click();
  await expect(page).toHaveURL(/\/register\?role=job_seeker$/);
  await expect(page.getByTestId("register-role-input-job-seeker")).toBeChecked();

  await page.getByTestId("register-email-input").fill("matrix-job-seeker@example.com");
  await page.getByTestId("register-password-input").fill("securepass123");
  await page.getByTestId("register-confirm-password-input").fill("securepass123");
  await page.getByTestId("register-submit-button").click();

  await expect(page.getByTestId("register-form-feedback")).toContainText(
    "Account created for Job Seeker. Check your email to continue."
  );

  await page.screenshot({
    path: "tests/screenshots/task10-step3-job-seeker-email-signup-success.png",
    fullPage: true
  });
});

test("anonymous protected access redirects through login and job seeker email login reaches the candidate workspace", async ({
  page
}) => {
  await page.goto("/job-seeker");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("login-submit-button")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task10-step4-protected-route-redirect-login.png",
    fullPage: true
  });

  await page.getByTestId("login-email-input").fill("jobseeker@example.com");
  await page.getByTestId("login-password-input").fill("securepass123");
  await page.getByTestId("login-submit-button").click();

  await expect(page).toHaveURL(/\/job-seeker$/);
  await expect(page.getByTestId("job-seeker-focus-card")).toBeVisible();

  await page.goto("/register");
  await expect(page).toHaveURL(/\/job-seeker$/);

  await page.screenshot({
    path: "tests/screenshots/task10-step5-job-seeker-email-destination.png",
    fullPage: true
  });
});

test("employer email login redirects away from the wrong protected route and bypasses public auth pages", async ({
  page
}) => {
  await page.goto("/login");

  await page.getByTestId("login-email-input").fill("employer@example.com");
  await page.getByTestId("login-password-input").fill("securepass123");
  await page.getByTestId("login-submit-button").click();

  await expect(page).toHaveURL(/\/employer$/);
  await expect(page.getByTestId("employer-chat-thread")).toBeVisible();

  await page.goto("/job-seeker");
  await expect(page).toHaveURL(/\/employer$/);

  await page.goto("/login");
  await expect(page).toHaveURL(/\/employer$/);

  await page.screenshot({
    path: "tests/screenshots/task10-step6-employer-redirect-guard.png",
    fullPage: true
  });
});

test("Google login routes a saved job seeker role directly into the job seeker workspace", async ({
  page
}) => {
  await page.goto("/login?mock-role=job_seeker");

  await expect(page.getByTestId("login-google-submit-button")).toBeVisible();
  await page.getByTestId("login-google-submit-button").click();

  await expect(page).toHaveURL(/\/job-seeker$/);
  await expect(page.getByTestId("job-seeker-prep-card")).toBeVisible();
  await expect(page.getByTestId("job-seeker-checklist")).toContainText("Resume context");

  await page.screenshot({
    path: "tests/screenshots/task10-step7-job-seeker-google-login.png",
    fullPage: true
  });
});
