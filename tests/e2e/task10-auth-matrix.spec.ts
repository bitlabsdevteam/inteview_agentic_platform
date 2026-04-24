import { expect, test } from "@playwright/test";
import {
  getEmployerCredentials,
  getJobSeekerCredentials,
  getJobSeekerSignupCredentials,
  hasCredentials,
  isRealGoogleOAuthEnabled
} from "./real-auth-env";

test("landing employer entry pre-fills registration and Google signup reaches the employer workspace", async ({
  page
}) => {
  test.skip(
    !isRealGoogleOAuthEnabled(),
    "Requires E2E_ENABLE_REAL_GOOGLE_OAUTH=true with a configured real Google OAuth environment."
  );

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
  await expect(page.getByTestId("account-header-profile")).toBeVisible();
  await expect(page.getByTestId("account-header-logout-button")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task10-step2-employer-google-destination.png",
    fullPage: true
  });

  await page.getByTestId("account-header-logout-button").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("landing-register-link")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task10-step3-employer-logout-public-home.png",
    fullPage: true
  });

  await page.goto("/employer");
  await expect(page).toHaveURL(/\/login$/);

  await page.screenshot({
    path: "tests/screenshots/task10-step4-employer-protected-after-logout.png",
    fullPage: true
  });
});

test("landing job seeker entry pre-fills registration and email signup succeeds", async ({
  page
}) => {
  const signupCredentials = getJobSeekerSignupCredentials();

  test.skip(
    !hasCredentials(signupCredentials),
    "Requires E2E_SUPABASE_SIGNUP_JOB_SEEKER_EMAIL and E2E_SUPABASE_SIGNUP_JOB_SEEKER_PASSWORD."
  );

  await page.goto("/");

  await page.getByTestId("landing-job-seeker-entry-link").click();
  await expect(page).toHaveURL(/\/register\?role=job_seeker$/);
  await expect(page.getByTestId("register-role-input-job-seeker")).toBeChecked();

  await page.getByTestId("register-email-input").fill(signupCredentials.email!);
  await page.getByTestId("register-password-input").fill(signupCredentials.password!);
  await page.getByTestId("register-confirm-password-input").fill(signupCredentials.password!);
  await page.getByTestId("register-submit-button").click();

  await expect(page).toHaveURL(/\/job-seeker$/);
  await expect(page.getByTestId("job-seeker-prep-card")).toBeVisible();
  await expect(page.getByTestId("account-header-profile")).toBeVisible();
  await expect(page.getByTestId("account-header-logout-button")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task10-step5-job-seeker-email-signup-success.png",
    fullPage: true
  });
});

test("anonymous protected access redirects through login and job seeker email login reaches the candidate workspace", async ({
  page
}) => {
  const jobSeekerCredentials = getJobSeekerCredentials();

  test.skip(
    !hasCredentials(jobSeekerCredentials),
    "Requires E2E_SUPABASE_JOB_SEEKER_EMAIL and E2E_SUPABASE_JOB_SEEKER_PASSWORD."
  );

  await page.goto("/job-seeker");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("login-submit-button")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task10-step6-protected-route-redirect-login.png",
    fullPage: true
  });

  await page.getByTestId("login-email-input").fill(jobSeekerCredentials.email!);
  await page.getByTestId("login-password-input").fill(jobSeekerCredentials.password!);
  await page.getByTestId("login-submit-button").click();

  await expect(page).toHaveURL(/\/job-seeker$/);
  await expect(page.getByTestId("job-seeker-focus-card")).toBeVisible();

  await page.goto("/register");
  await expect(page).toHaveURL(/\/job-seeker$/);

  await page.screenshot({
    path: "tests/screenshots/task10-step7-job-seeker-email-destination.png",
    fullPage: true
  });

  await page.getByTestId("account-header-logout-button").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("landing-login-link")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task10-step8-job-seeker-logout-public-home.png",
    fullPage: true
  });

  await page.goto("/job-seeker");
  await expect(page).toHaveURL(/\/login$/);

  await page.screenshot({
    path: "tests/screenshots/task10-step9-job-seeker-protected-after-logout.png",
    fullPage: true
  });
});

test("employer email login redirects away from the wrong protected route and bypasses public auth pages", async ({
  page
}) => {
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
  await expect(page.getByTestId("employer-chat-thread")).toBeVisible();

  await page.goto("/job-seeker");
  await expect(page).toHaveURL(/\/employer$/);

  await page.goto("/login");
  await expect(page).toHaveURL(/\/employer$/);

  await page.screenshot({
    path: "tests/screenshots/task10-step10-employer-redirect-guard.png",
    fullPage: true
  });
});

test("Google login routes a saved job seeker role directly into the job seeker workspace", async ({
  page
}) => {
  test.skip(
    !isRealGoogleOAuthEnabled(),
    "Requires E2E_ENABLE_REAL_GOOGLE_OAUTH=true with a configured real Google OAuth environment."
  );

  await page.goto("/login");

  await expect(page.getByTestId("login-google-submit-button")).toBeVisible();
  await page.getByTestId("login-google-submit-button").click();

  await expect(page).toHaveURL(/\/job-seeker$/);
  await expect(page.getByTestId("job-seeker-prep-card")).toBeVisible();
  await expect(page.getByTestId("job-seeker-checklist")).toContainText("Resume context");

  await page.screenshot({
    path: "tests/screenshots/task10-step11-job-seeker-google-login.png",
    fullPage: true
  });
});
