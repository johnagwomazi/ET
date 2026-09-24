import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

const organization = {
  _id: "64b64b64b64b64b64b64b801",
  organizationName: "Acme Events",
  status: "APPROVED",
};

const organizer = {
  _id: "64b64b64b64b64b64b64b802",
  firstName: "Ada",
  lastName: "Organizer",
  email: "ada@example.com",
  role: "ADMIN",
  accountStatus: "ACTIVE",
  organization,
};

const customer = {
  _id: "64b64b64b64b64b64b64b803",
  firstName: "Ife",
  lastName: "Customer",
  email: "ife@example.com",
  role: "CUSTOMER",
  accountStatus: "ACTIVE",
};

const organizerPermissions = [
  "ORGANIZATION_CONTEXT_VIEW",
  "ORGANIZATION_VIEW",
  "ORGANIZATION_UPDATE",
  "DASHBOARD_VIEW",
];

function apiResponse(data) {
  return { success: true, message: "Operation successful", data };
}

async function installMocks(page, user) {
  const requests = [];

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api", "");
    requests.push({ method: request.method(), path });

    if (path === "/auth/me") {
      return route.fulfill({
        json: apiResponse({
          user,
          organizationPermissions: user.role === "ADMIN" ? organizerPermissions : [],
        }),
      });
    }
    if (path === "/notifications/unread-count") {
      return route.fulfill({ json: apiResponse({ unreadCount: 0 }) });
    }
    if (path === "/organizations/me/dashboard") {
      return route.fulfill({
        json: apiResponse({
          organization,
          stats: {},
          recentActivity: [],
          quickActions: [],
        }),
      });
    }
    if (path === "/events/discover") {
      return route.fulfill({
        json: apiResponse({
          events: [],
          featuredEvents: [],
          trendingEvents: [],
          pagination: { page: 1, limit: 12, totalItems: 0, totalPages: 0 },
        }),
      });
    }
    if (path === "/ticketing/tickets") {
      return route.fulfill({
        json: apiResponse({
          tickets: [],
          pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
        }),
      });
    }
    if (path === "/ticketing/history") {
      return route.fulfill({
        json: apiResponse({
          history: [],
          pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
        }),
      });
    }

    return route.fulfill({ json: apiResponse({}) });
  });

  return requests;
}

test("organizer can switch between dashboard and marketplace and access buyer pages", async ({ page }) => {
  await installMocks(page, organizer);
  await page.goto("/organization/dashboard");

  const marketplaceButton = page.getByRole("link", { name: "Browse event marketplace" });
  await expect(marketplaceButton).toBeVisible();
  await marketplaceButton.click();
  await expect(page).toHaveURL("http://127.0.0.1:4174/");

  const dashboardButton = page.getByRole("link", { name: "Dashboard", exact: true });
  await expect(dashboardButton).toBeVisible();

  await page.getByRole("button", { name: "Open account menu" }).click();
  await expect(page.getByRole("menuitem", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "History" })).toBeVisible();
  await page.getByRole("menuitem", { name: "My Tickets" }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByText("Marketplace account", { exact: true })).toBeVisible();

  await page.evaluate(() => {
    sessionStorage.setItem("events_checkout_selection", JSON.stringify({
      eventId: "64b64b64b64b64b64b64b810",
      eventName: "Other Organizer Event",
      idempotencyKey: "organizer-marketplace-checkout",
      items: [{
        ticketTypeId: "64b64b64b64b64b64b64b811",
        name: "Regular",
        quantity: 1,
        price: 2500,
        currency: "NGN",
      }],
    }));
  });
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Complete your order" })).toBeVisible();

  const role = await page.evaluate(async () => {
    const { useSessionStore } = await import("/src/store/useSessionStore.js");
    return useSessionStore.getState().currentUser?.role;
  });
  expect(role).toBe("ADMIN");
});

test.describe("mobile organizer navigation", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("keeps marketplace, dashboard, tickets, and history accessible", async ({ page }) => {
    await installMocks(page, organizer);
    await page.goto("/organization/dashboard");

    await page.getByRole("link", { name: "Browse event marketplace" }).click();
    await expect(page).toHaveURL("http://127.0.0.1:4174/");
    await expect(page.getByRole("link", { name: "Open dashboard" })).toBeVisible();

    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await expect(page.getByRole("link", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByRole("link", { name: "History" })).toBeVisible();
  });
});

test("customer-only accounts keep the public navbar without an organizer dashboard button", async ({ page }) => {
  await installMocks(page, customer);
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open account menu" })).toBeVisible();
});
