import { expect, test } from "@playwright/test";
import { isRealGoogleOAuthEnabled } from "./real-auth-env";

test("Google registration carries the selected employer role into the app", async ({ page }) => {
  test.skip(
    !isRealGoogleOAuthEnabled(),
    "Requires E2E_ENABLE_REAL_GOOGLE_OAUTH=true with a configured real Google OAuth environment."
  );

  await page.goto("/register?role=employer");

  await expect(page.getByTestId("register-google-submit-button")).toBeEnabled();

  await page.screenshot({
    path: "tests/screenshots/task5-step1-register-google-ready.png",
    fullPage: true
  });

  await page.getByTestId("register-google-submit-button").click();

  await expect(page).toHaveURL(/\/employer$/);
  await expect(page.getByRole("heading", { name: "Employer agent workspace" })).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task5-step2-register-google-employer-destination.png",
    fullPage: true
  });
});

test("Google login routes users without a saved role through role completion", async ({ page }) => {
  test.skip(
    !isRealGoogleOAuthEnabled(),
    "Requires E2E_ENABLE_REAL_GOOGLE_OAUTH=true with a configured real Google OAuth environment."
  );

  await page.goto("/login");

  await expect(page.getByTestId("login-google-submit-button")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task5-step3-login-google-entry.png",
    fullPage: true
  });

  await page.getByTestId("login-google-submit-button").click();

  await expect(page).toHaveURL(/\/auth\/complete-role/);
  await expect(page.getByRole("heading", { name: "Complete your role setup" })).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task5-step4-complete-role-required.png",
    fullPage: true
  });

  await page.getByTestId("register-role-option-job-seeker").click();
  await page.getByTestId("complete-role-submit-button").click();

  await expect(page).toHaveURL(/\/job-seeker$/);
  await expect(page.getByRole("heading", { name: "Job seeker workspace" })).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/task5-step5-complete-role-job-seeker-destination.png",
    fullPage: true
  });
});
