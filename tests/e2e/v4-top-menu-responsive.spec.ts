import { expect, test, type Locator, type Page } from "@playwright/test";

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

async function expectInViewport(locator: Locator, page: Page) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();

  if (!box || !viewport) {
    return;
  }

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

function boxesOverlap(a: Box, b: Box) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

test.describe("v4 responsive account top menu", () => {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    test(`keeps public header controls reachable without overlap on ${viewport.name}`, async ({
      page
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");

      const header = page.getByTestId("account-header");
      const brand = page.getByTestId("account-header-brand-link");
      const nav = page.getByTestId("account-header-primary-nav");
      const publicState = page.getByTestId("account-header-public-state");
      const navItems = [
        page.getByTestId("account-header-nav-home"),
        page.getByTestId("account-header-nav-login"),
        page.getByTestId("account-header-nav-register"),
        page.getByTestId("account-header-nav-employer"),
        page.getByTestId("account-header-nav-job-seeker")
      ];

      await expect(header).toBeVisible();
      await expect(brand).toBeVisible();
      await expect(nav).toBeVisible();
      await expect(publicState).toBeVisible();

      for (const item of navItems) {
        await expect(item).toBeVisible();
        await expectInViewport(item, page);
      }

      await expectInViewport(brand, page);
      await expectInViewport(publicState, page);

      const navBox = await nav.boundingBox();
      const publicStateBox = await publicState.boundingBox();

      expect(navBox).not.toBeNull();
      expect(publicStateBox).not.toBeNull();

      if (navBox && publicStateBox) {
        expect(boxesOverlap(navBox, publicStateBox)).toBe(false);
      }

      await page.screenshot({
        path: `tests/screenshots/v4-task8-${viewport.name}-top-menu.png`,
        fullPage: true
      });
    });
  }
});
