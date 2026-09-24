import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

const organizationId = "64b64b64b64b64b64b64b605";
const eventId = "64b64b64b64b64b64b64b607";

function apiResponse(data) {
  return { success: true, message: "Operation successful", data };
}

const summary = {
  currency: "NGN",
  grossSales: 5000,
  netRevenue: 4500,
  refunds: 500,
  ticketsSold: 10,
  successfulOrders: 6,
  successfulRefunds: 1,
  events: 1,
  attendance: 7,
  ticketLinkedAttendance: 7,
  legacyAttendance: 0,
  attendanceRate: 70,
  sellableInventory: 20,
  ticketsRemaining: 10,
  salesRate: 50,
  pendingPayments: 0,
  failedPayments: 0,
};

const eventPerformance = {
  event: {
    id: eventId,
    name: "Launch Night",
    status: "PUBLISHED",
    startAt: "2026-09-20T18:00:00.000Z",
    endAt: "2026-09-20T22:00:00.000Z",
    capacity: 100,
  },
  currency: "NGN",
  grossSales: 5000,
  netRevenue: 4500,
  ticketsSold: 10,
  attendance: 7,
  attendanceRate: 70,
  salesRate: 50,
};

const ticketTypes = [
  {
    ticketType: { id: "64b64b64b64b64b64b64b609", eventId, name: "Regular", status: "ACTIVE" },
    currency: "NGN",
    grossSales: 2000,
    ticketsSold: 5,
    sellableInventory: 12,
    ticketsRemaining: 7,
    salesRate: 41.67,
  },
  {
    ticketType: { id: "64b64b64b64b64b64b64b610", eventId, name: "VIP", status: "ACTIVE" },
    currency: "NGN",
    grossSales: 3000,
    ticketsSold: 5,
    sellableInventory: 8,
    ticketsRemaining: 3,
    salesRate: 62.5,
  },
];

async function installMocks(page) {
  const requests = [];
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api", "");
    requests.push(path);

    if (path === "/auth/me") {
      return route.fulfill({
        json: apiResponse({
          user: {
            _id: "64b64b64b64b64b64b64b601",
            firstName: "Ada",
            lastName: "Admin",
            email: "ada@example.com",
            role: "ADMIN",
            accountStatus: "ACTIVE",
            organization: { _id: organizationId, organizationName: "Acme Events", status: "APPROVED" },
          },
          organizationPermissions: ["ORGANIZATION_UPDATE", "ORGANIZATION_VIEW", "DASHBOARD_VIEW"],
        }),
      });
    }
    if (path === "/notifications/unread-count") {
      return route.fulfill({ json: apiResponse({ unreadCount: 0 }) });
    }
    if (path === "/organizations/me/events") {
      return route.fulfill({
        json: apiResponse({ events: [{ _id: eventId, eventName: "Launch Night" }] }),
      });
    }
    if (path === "/organizations/me/analytics/overview") {
      return route.fulfill({ json: apiResponse({ summary }) });
    }
    if (path === "/organizations/me/analytics/events") {
      return route.fulfill({
        json: apiResponse({
          events: [eventPerformance],
          pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
        }),
      });
    }
    if (path === `/organizations/me/events/${eventId}/analytics`) {
      return route.fulfill({
        json: apiResponse({ event: eventPerformance.event, summary, ticketTypes }),
      });
    }
    if (path === "/organizations/me/analytics/sales") {
      return route.fulfill({
        json: apiResponse({
          period: "daily",
          currency: "NGN",
          series: [
            { periodStart: "2026-09-19T00:00:00.000Z", ticketsSold: 4, attendance: 1 },
            { periodStart: "2026-09-20T00:00:00.000Z", ticketsSold: 6, attendance: 6 },
          ],
        }),
      });
    }

    return route.fulfill({ status: 404, json: { success: false, message: `Unexpected request: ${path}` } });
  });
  return requests;
}

test("organization analytics stays concise and View opens scoped event performance", async ({ page }) => {
  const requests = await installMocks(page);
  await page.goto("/organization/analytics", { waitUntil: "commit" });

  await expect(page.getByRole("heading", { name: "Organization performance" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel("Date range")).toBeVisible();
  await expect(page.getByLabel("Event")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
  await expect(page.getByText("Gross sales", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Tickets remaining", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Compare events" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Launch Night", exact: true })).toBeVisible();
  await expect(page.getByText("Attendance rate", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Sales rate", { exact: true }).first()).toBeVisible();

  await expect(page.getByRole("heading", { name: "Attendance performance" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Revenue over time" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Ticket types" })).toHaveCount(0);
  expect(requests.some((path) => path === "/organizations/me/analytics/sales")).toBe(false);
  expect(requests.some((path) => path === "/organizations/me/analytics/ticket-types")).toBe(false);

  await page.getByRole("link", { name: "View", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/organization/events/${eventId}/analytics`));
  const chartHeading = page.getByRole("heading", { name: "Event performance over time" });
  await expect(chartHeading).toBeVisible();
  const chart = chartHeading.locator("..").locator("..");
  await expect(chart.getByText("Tickets sold", { exact: true }).first()).toBeVisible();
  await expect(chart.getByText("Attendance", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ticket-type performance" })).toBeVisible();
  await expect(page.getByText("Regular", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("VIP", { exact: true }).first()).toBeVisible();
});

test("event analytics comparison remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installMocks(page);
  await page.goto(`/organization/events/${eventId}/analytics`, { waitUntil: "commit" });

  await expect(page.getByRole("heading", { name: "Event performance over time" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Regular", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("VIP", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Inventory", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Remaining", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("41.67%").last()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
