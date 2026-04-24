import { expect, test } from "@playwright/test";

test("landing page explains the platform and exposes employer and job seeker entry points", async ({
  page
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Interview agents for both sides of the hiring loop" })).toBeVisible();
  await expect(page.getByText("Create roles, prepare candidates, and move from first visit to authenticated workflow without losing the context of who the user is.")).toBeVisible();

  await page.screenshot({ path: "tests/screenshots/task2-step1-landing-page.png", fullPage: true });

  const loginLink = page.getByTestId("landing-login-link");
  const registerLink = page.getByTestId("landing-register-link");
  const employerEntryLink = page.getByTestId("landing-employer-entry-link");
  const jobSeekerEntryLink = page.getByTestId("landing-job-seeker-entry-link");

  await expect(loginLink).toHaveAttribute("href", "/auth/google?intent=login");
  await expect(registerLink).toHaveAttribute("href", "/auth/google?intent=register");
  await expect(employerEntryLink).toHaveAttribute("href", "/register?role=employer");
  await expect(jobSeekerEntryLink).toHaveAttribute("href", "/register?role=job_seeker");

  await employerEntryLink.click();
  await expect(page).toHaveURL(/\/register\?role=employer$/);

  await page.screenshot({ path: "tests/screenshots/task2-step2-employer-entry.png", fullPage: true });
});
