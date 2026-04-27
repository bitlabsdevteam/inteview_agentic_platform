import { expect, test } from "@playwright/test";

import { getEmployerCredentials, hasCredentials } from "./real-auth-env";

function hasSupabaseRuntimeEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

function hasOpenAIRuntimeEnv() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

test("employer can open candidate profile assistant panel and ask for next step", async ({ page }) => {
  const employerCredentials = getEmployerCredentials();

  test.skip(
    !hasSupabaseRuntimeEnv() || !hasCredentials(employerCredentials) || !hasOpenAIRuntimeEnv(),
    "Requires Supabase runtime env, employer credentials, and OPENAI_API_KEY for assistant action flow."
  );

  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(employerCredentials.email!);
  await page.getByTestId("login-password-input").fill(employerCredentials.password!);
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/employer$/);

  await page.goto("/employer/jobs");
  await expect(page.getByTestId("employer-jobs-list")).toBeVisible();

  const firstJobAction = page.getByTestId("employer-job-action-continue").first();
  test.skip((await firstJobAction.count()) === 0, "Requires at least one employer job.");

  const detailHref = await firstJobAction.getAttribute("href");
  if (!detailHref) {
    test.skip(true, "Unable to resolve job detail link.");
    return;
  }

  await page.goto(`${detailHref}/candidates`);
  await expect(page.getByTestId("employer-candidates-list")).toBeVisible();

  const firstReviewProfileLink = page.getByRole("link", { name: "Review Profile" }).first();
  test.skip((await firstReviewProfileLink.count()) === 0, "Requires at least one candidate profile.");

  await firstReviewProfileLink.click();

  await expect(page.getByTestId("employer-candidate-profile")).toBeVisible();
  await expect(page.getByTestId("employer-assistant-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask Assistant for Next Step" })).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/v11-task14-step1-assistant-panel-before-ask.png",
    fullPage: true
  });

  await page.getByRole("button", { name: "Ask Assistant for Next Step" }).click();

  await expect(page).toHaveURL(/\/employer\/jobs\/[^/]+\/candidates\/[^/]+$/);
  await expect(page.getByTestId("employer-assistant-panel")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/v11-task14-step2-assistant-panel-after-ask.png",
    fullPage: true
  });
});

test("anonymous access to employer assistant candidate profile route is denied", async ({ page }) => {
  test.skip(
    !hasSupabaseRuntimeEnv(),
    "Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for app runtime."
  );

  await page.goto("/employer/jobs/job-1/candidates/profile-1");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("login-submit-button")).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/v11-task14-step3-assistant-route-anonymous-denied.png",
    fullPage: true
  });
});
