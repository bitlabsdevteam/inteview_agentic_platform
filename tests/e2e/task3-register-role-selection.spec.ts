import { expect, test } from "@playwright/test";

test("registration requires a role selection before the account flow can continue", async ({
  page
}) => {
  await page.goto("/register");

  await expect(page.getByRole("heading", { name: "Create your account with the right role context" })).toBeVisible();

  const continueButton = page.getByTestId("register-submit-button");
  const employerCard = page.getByTestId("register-role-option-employer");
  const jobSeekerCard = page.getByTestId("register-role-option-job-seeker");
  const roleSummary = page.getByTestId("register-role-summary");

  await expect(continueButton).toBeDisabled();
  await expect(roleSummary).toContainText("Choose whether you are registering as an employer or a job seeker.");

  await page.screenshot({ path: "tests/screenshots/task3-step1-register-initial.png", fullPage: true });

  await employerCard.click();

  await expect(page.getByTestId("register-role-input-employer")).toBeChecked();
  await expect(roleSummary).toContainText("Employer");
  await expect(continueButton).toBeEnabled();

  await page.screenshot({ path: "tests/screenshots/task3-step2-register-employer-selected.png", fullPage: true });

  await jobSeekerCard.click();

  await expect(page.getByTestId("register-role-input-job-seeker")).toBeChecked();
  await expect(roleSummary).toContainText("Job Seeker");
  await expect(continueButton).toBeEnabled();

  await page.goto("/register?role=employer");

  await expect(page.getByTestId("register-role-input-employer")).toBeChecked();
  await expect(page.getByTestId("register-role-summary")).toContainText("Employer");
  await expect(page.getByTestId("register-submit-button")).toBeEnabled();

  await page.screenshot({ path: "tests/screenshots/task3-step3-register-prefilled-role.png", fullPage: true });
});
