import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

const eventId = "64b64b64b64b64b64b64b901";
const organization = {
  _id: "64b64b64b64b64b64b64b902",
  organizationName: "Acme Events",
  status: "ACTIVE",
};
const organizer = {
  _id: "64b64b64b64b64b64b64b903",
  firstName: "Ada",
  lastName: "Organizer",
  email: "ada@example.com",
  role: "ADMIN",
  accountStatus: "ACTIVE",
  organization,
};
const event = {
  _id: eventId,
  eventName: "Launch Night",
  slug: "launch-night",
  description: "A launch event",
  category: "Business",
  capacity: 100,
  status: "PUBLISHED",
  startAt: "2026-10-10T18:00:00.000Z",
  endAt: "2026-10-10T22:00:00.000Z",
  createdAt: "2026-09-20T10:00:00.000Z",
  updatedAt: "2026-09-20T10:00:00.000Z",
  organization,
  createdBy: organizer,
};

function apiResponse(data) {
  return { success: true, message: "Operation successful", data };
}

test("ticket creation keeps entered data on backdrop click and omits Position", async ({ page }) => {
  let createdPayload = null;

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api", "");

    if (path === "/auth/me") {
      return route.fulfill({
        json: apiResponse({
          user: organizer,
          organizationPermissions: ["ORGANIZATION_CONTEXT_VIEW", "ORGANIZATION_VIEW", "ORGANIZATION_UPDATE"],
        }),
      });
    }
    if (path === "/notifications/unread-count") {
      return route.fulfill({ json: apiResponse({ unreadCount: 0 }) });
    }
    if (path === `/organizations/me/events/${eventId}/ticket-types`) {
      if (request.method() === "POST") {
        createdPayload = request.postDataJSON();
        return route.fulfill({ json: apiResponse({ ticketType: { id: "ticket-type-1", ...createdPayload } }) });
      }
      return route.fulfill({
        json: apiResponse({
          ticketTypes: [],
          inventory: { eventCapacity: 100, allocatedQuantity: 0, issuedQuantity: 0 },
        }),
      });
    }
    if (path === `/organizations/me/events/${eventId}`) {
      return route.fulfill({ json: apiResponse({ event }) });
    }

    return route.fulfill({ json: apiResponse({}) });
  });

  await page.goto(`/organization/events/${eventId}`, { waitUntil: "commit" });
  await page.getByRole("button", { name: "New ticket" }).click();

  const dialog = page.getByRole("dialog", { name: "Create ticket type" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Position")).toHaveCount(0);

  await dialog.getByLabel("Name").fill("VIP");
  await page.locator(".app-overlay").click({ position: { x: 4, y: 4 } });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Name")).toHaveValue("VIP");

  await dialog.getByLabel("Price").fill("5000");
  await dialog.getByLabel("Allocation").fill("10");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0);
  expect(createdPayload).toMatchObject({ name: "VIP", price: 5000, quantity: 10, position: 0 });
});

test.describe("mobile Super Admin dashboard", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("shows real metrics, event performance, activity, and Analytics access", async ({ page }) => {
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api", "");

      if (path === "/auth/me") {
        return route.fulfill({
          json: apiResponse({
            user: { ...organizer, role: "SUPER_ADMIN", organization: null },
            organizationPermissions: [],
          }),
        });
      }
      if (path === "/notifications/unread-count") {
        return route.fulfill({ json: apiResponse({ unreadCount: 0 }) });
      }
      if (path === "/admin/dashboard/overview") {
        return route.fulfill({
          json: apiResponse({
            totalUsers: 42,
            totalOrganizations: 6,
            totalEvents: 15,
            activeEvents: 4,
            recentActivity: [{
              id: "order-1",
              type: "TICKET_PURCHASED",
              title: "Ticket purchase completed",
              description: "2 tickets purchased for Launch Night.",
              occurredAt: "2026-09-27T10:00:00.000Z",
            }],
          }),
        });
      }
      if (path === "/admin/analytics/overview") {
        return route.fulfill({
          json: apiResponse({
            summary: { grossSales: 125000, currency: "NGN" },
            topEvents: [{
              event: { id: eventId, name: "Launch Night", status: "PUBLISHED" },
              currency: "NGN",
              grossSales: 75000,
              netRevenue: 70000,
              ticketsSold: 30,
              attendance: 20,
              attendanceRate: 66.67,
              salesRate: 30,
            }],
          }),
        });
      }
      if (path === "/admin/organizations") {
        return route.fulfill({ json: apiResponse({ organizations: [], pagination: {} }) });
      }

      return route.fulfill({ json: apiResponse({}) });
    });

    await page.goto("/super-admin/dashboard", { waitUntil: "commit" });

    await expect(page.getByText("Total Users")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("42", { exact: true })).toBeVisible();
    await expect(page.getByText("Gross Ticket Sales")).toBeVisible();
    await expect(page.getByText("Active Events")).toBeVisible();
    await expect(page.getByText("Launch Night", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("2 tickets purchased for Launch Night.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open analytics" })).toBeVisible();
    await expect(page.getByText("Pending Organizations")).toHaveCount(0);
  });
});
