import { expect, test } from "@playwright/test";

const accessToken = "safari-access-token";
const user = {
  _id: "64b64b64b64b64b64b64b701",
  firstName: "Ife",
  lastName: "Customer",
  email: "ife@example.com",
  role: "CUSTOMER",
  accountStatus: "ACTIVE",
};

function apiResponse(data) {
  return { success: true, message: "Operation successful", data };
}

test("login uses the returned bearer token when cross-site cookies are unavailable", async ({ page }) => {
  test.setTimeout(120_000);
  const meAuthorizationHeaders = [];

  await page.route(/^http:\/\/(?:api\.test|localhost:5000)\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api", "");

    if (path === "/auth/login") {
      return route.fulfill({ json: apiResponse({ user, accessToken }) });
    }

    if (path === "/auth/me") {
      const authorization = request.headers().authorization || "";
      meAuthorizationHeaders.push(authorization);

      if (authorization !== `Bearer ${accessToken}`) {
        return route.fulfill({
          status: 401,
          json: { success: false, message: "Not authorized", data: null },
        });
      }

      return route.fulfill({
        json: apiResponse({ user, organizationPermissions: [] }),
      });
    }

    if (path === "/notifications/unread-count") {
      return route.fulfill({ json: apiResponse({ unreadCount: 0 }) });
    }

    return route.fulfill({ json: apiResponse({}) });
  });

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill("ife@example.com");
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("http://127.0.0.1:4174/");
  await expect.poll(() => meAuthorizationHeaders.filter(Boolean).length).toBeGreaterThan(0);
  expect(meAuthorizationHeaders).toContain(`Bearer ${accessToken}`);
  expect(await page.evaluate(() => localStorage.getItem("events_access_token"))).toBe(accessToken);

  await page.reload();
  await expect(page).toHaveURL("http://127.0.0.1:4174/");
  expect(meAuthorizationHeaders.at(-1)).toBe(`Bearer ${accessToken}`);
});
