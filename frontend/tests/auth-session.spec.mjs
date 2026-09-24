import { expect, test } from "@playwright/test";

test.setTimeout(120_000);
test.describe.configure({ mode: "serial" });

const customer = {
  _id: "64b64b64b64b64b64b64b701",
  firstName: "Ife",
  lastName: "Customer",
  email: "ife@example.com",
  role: "CUSTOMER",
  accountStatus: "ACTIVE",
};

const organizationAdmin = {
  _id: "64b64b64b64b64b64b64b702",
  firstName: "Ada",
  lastName: "Organizer",
  email: "ada@example.com",
  role: "ADMIN",
  accountStatus: "ACTIVE",
  organization: {
    _id: "64b64b64b64b64b64b64b703",
    organizationName: "Acme Events",
    status: "APPROVED",
  },
};

function apiResponse(data) {
  return { success: true, message: "Operation successful", data };
}

test("login and page restoration use secure cookies without browser token storage", async ({ page }) => {
  let sessionValid = false;
  const authorizationHeaders = [];

  await page.addInitScript(() => localStorage.setItem("events_access_token", "legacy-token"));
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api", "");
    authorizationHeaders.push(request.headers().authorization || "");

    if (path === "/auth/login") {
      sessionValid = true;
      return route.fulfill({ json: apiResponse({ user: customer }) });
    }
    if (path === "/auth/me" && sessionValid) {
      return route.fulfill({ json: apiResponse({ user: customer, organizationPermissions: [] }) });
    }
    if (path === "/auth/refresh") {
      return route.fulfill({ status: 401, json: { success: false, message: "Session expired" } });
    }
    if (path === "/notifications/unread-count") {
      return route.fulfill({ json: apiResponse({ unreadCount: 0 }) });
    }
    return route.fulfill({ status: 401, json: { success: false, message: "Not authorized" } });
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(customer.email);
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL("http://127.0.0.1:4174/");
  expect(await page.evaluate(() => localStorage.getItem("events_access_token"))).toBeNull();
  expect(authorizationHeaders.every((header) => header === "")).toBe(true);

  await page.reload();
  await expect(page).toHaveURL("http://127.0.0.1:4174/");
  expect(authorizationHeaders.every((header) => header === "")).toBe(true);
});

test("returning with an expired access token refreshes and retries session restoration", async ({ page }) => {
  let accessValid = false;
  let refreshCalls = 0;
  let meCalls = 0;

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api", "");
    if (path === "/auth/me") {
      meCalls += 1;
      return accessValid
        ? route.fulfill({ json: apiResponse({ user: customer, organizationPermissions: [] }) })
        : route.fulfill({ status: 401, json: { success: false, message: "Not authorized" } });
    }
    if (path === "/auth/refresh") {
      refreshCalls += 1;
      accessValid = true;
      return route.fulfill({ json: apiResponse({}) });
    }
    if (path === "/notifications/unread-count") {
      return route.fulfill({ json: apiResponse({ unreadCount: 0 }) });
    }
    return route.fulfill({ json: apiResponse({}) });
  });

  await page.goto("/");
  await expect.poll(() => meCalls).toBe(2);
  expect(refreshCalls).toBe(1);
  await expect(page.getByText(customer.firstName, { exact: true })).toBeVisible();
});

test("concurrent checkout and event requests share one refresh and retry once", async ({ page }) => {
  let accessValid = true;
  let refreshCalls = 0;
  const protectedAttempts = new Map();

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api", "");
    if (path === "/auth/me") {
      return route.fulfill({ json: apiResponse({ user: customer, organizationPermissions: [] }) });
    }
    if (path === "/notifications/unread-count") {
      return route.fulfill({ json: apiResponse({ unreadCount: 0 }) });
    }
    if (path === "/auth/refresh") {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 75));
      accessValid = true;
      return route.fulfill({ json: apiResponse({}) });
    }
    if (path === "/ticketing/checkout" || path === "/organizations/me/events") {
      protectedAttempts.set(path, (protectedAttempts.get(path) || 0) + 1);
      return accessValid
        ? route.fulfill({ json: apiResponse({ ok: true }) })
        : route.fulfill({ status: 401, json: { success: false, message: "Not authorized" } });
    }
    return route.fulfill({ json: apiResponse({}) });
  });

  await page.goto("/");
  accessValid = false;
  const result = await page.evaluate(async () => {
    const { post } = await import("/src/api/httpClient.js");
    return Promise.all([
      post("/ticketing/checkout", { eventId: "event-1" }),
      post("/organizations/me/events", { eventName: "Draft" }),
    ]);
  });

  expect(result).toHaveLength(2);
  expect(refreshCalls).toBe(1);
  expect(protectedAttempts.get("/ticketing/checkout")).toBe(2);
  expect(protectedAttempts.get("/organizations/me/events")).toBe(2);
});

test("expired sessions preserve the event form through reauthentication and logout clears state", async ({ page }) => {
  let sessionRevoked = false;
  let logoutCalls = 0;
  const permissions = ["ORGANIZATION_CONTEXT_VIEW", "ORGANIZATION_VIEW", "ORGANIZATION_UPDATE"];

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api", "");
    if (path === "/auth/me" && !sessionRevoked) {
      return route.fulfill({ json: apiResponse({ user: organizationAdmin, organizationPermissions: permissions }) });
    }
    if (path === "/notifications/unread-count" && !sessionRevoked) {
      return route.fulfill({ json: apiResponse({ unreadCount: 0 }) });
    }
    if (path === "/auth/login") {
      sessionRevoked = false;
      return route.fulfill({ json: apiResponse({ user: organizationAdmin }) });
    }
    if (path === "/auth/logout") {
      logoutCalls += 1;
      sessionRevoked = true;
      return route.fulfill({ json: apiResponse({}) });
    }
    if (path === "/auth/refresh" || sessionRevoked) {
      return route.fulfill({ status: 401, json: { success: false, message: "Session expired" } });
    }
    return route.fulfill({ json: apiResponse({}) });
  });

  await page.goto("/organization/events/new");
  const eventName = page.getByLabel("Event name");
  await eventName.fill("Unsaved festival");

  sessionRevoked = true;
  await page.evaluate(async () => {
    const { post } = await import("/src/api/httpClient.js");
    await post("/organizations/me/events", { eventName: "Unsaved festival" }).catch(() => {});
  });

  await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();
  await expect(page).toHaveURL(/\/organization\/events\/new$/);
  await expect(eventName).toHaveValue("Unsaved festival");

  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeHidden();
  await expect(eventName).toHaveValue("Unsaved festival");

  await page.evaluate(async () => {
    const { useSessionStore } = await import("/src/store/useSessionStore.js");
    await useSessionStore.getState().logout();
  });
  await expect(page).toHaveURL(/\/login$/);
  expect(logoutCalls).toBe(1);
});

test.describe("mobile session restoration", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("renews an expired access session on a mobile viewport", async ({ page }) => {
    let accessValid = false;
    let refreshCalls = 0;
    let meCalls = 0;

    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api", "");
      if (path === "/auth/me") {
        meCalls += 1;
        return accessValid
          ? route.fulfill({ json: apiResponse({ user: customer, organizationPermissions: [] }) })
          : route.fulfill({ status: 401, json: { success: false, message: "Not authorized" } });
      }
      if (path === "/auth/refresh") {
        refreshCalls += 1;
        accessValid = true;
        return route.fulfill({ json: apiResponse({}) });
      }
      if (path === "/notifications/unread-count") {
        return route.fulfill({ json: apiResponse({ unreadCount: 0 }) });
      }
      return route.fulfill({ json: apiResponse({}) });
    });

    await page.goto("/");
    await expect.poll(() => meCalls).toBe(2);
    expect(refreshCalls).toBe(1);
    await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  });
});
