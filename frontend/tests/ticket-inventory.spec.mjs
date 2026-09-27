import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

const eventId = "64b64b64b64b64b64b64b901";
const ticketTypeId = "64b64b64b64b64b64b64b902";
const response = (data) => ({ success: true, message: "Operation successful", data });

test("customer availability refreshes from sold out to available and preserves sales-end state", async ({ page }) => {
  let availability = "SOLD_OUT";
  let remainingQuantity = 0;

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api", "");
    if (path === "/auth/me") {
      return route.fulfill({ status: 401, json: { success: false, message: "Not authorized" } });
    }
    if (path === `/events/${eventId}`) {
      return route.fulfill({
        json: response({
          event: {
            id: eventId,
            eventName: "Inventory Live",
            description: "Inventory recovery test event",
            status: "PUBLISHED",
            capacity: 120,
            startAt: "2027-01-10T18:00:00.000Z",
            endAt: "2027-01-10T21:00:00.000Z",
            venue: { name: "Civic Centre", address: { city: "Lagos", country: "Nigeria" } },
            organization: { organizationName: "Eventidor Test" },
          },
        }),
      });
    }
    if (path === `/events/${eventId}/ticket-types`) {
      return route.fulfill({
        json: response({
          ticketTypes: [{
            id: ticketTypeId,
            name: "Regular",
            description: "General admission",
            price: 2500,
            currency: "NGN",
            quantity: 120,
            soldQuantity: 120 - remainingQuantity,
            remainingQuantity,
            maxPerOrder: 10,
            status: availability === "AVAILABLE" ? "ACTIVE" : "INACTIVE",
            configuredStatus: "ACTIVE",
            availability,
            saleEndsAt: "2027-01-09T23:59:00.000Z",
          }],
        }),
      });
    }
    return route.fulfill({ json: response({}) });
  });

  await page.goto(`/events/${eventId}`);
  await expect(page.getByRole("heading", { name: "Inventory Live" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Sold Out", { exact: false })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Increase Regular quantity" })).toBeDisabled();

  availability = "AVAILABLE";
  remainingQuantity = 20;
  await page.reload({ waitUntil: "commit" });
  await expect(page.getByText("20 remaining", { exact: false })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Increase Regular quantity" })).toBeEnabled();

  availability = "SALES_ENDED";
  await page.reload({ waitUntil: "commit" });
  await expect(page.getByText("Sales Ended", { exact: false })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Increase Regular quantity" })).toBeDisabled();
});

test("ticket allocation uses refreshed inventory capacity instead of a stale event prop", async ({ page }) => {
  let allocationPatch;
  const organization = {
    _id: "64b64b64b64b64b64b64b910",
    organizationName: "Inventory Events",
    status: "ACTIVE",
  };
  const staleEvent = {
    _id: eventId,
    id: eventId,
    eventName: "Capacity Upgrade",
    slug: "capacity-upgrade",
    description: "Capacity has just been increased.",
    status: "PUBLISHED",
    capacity: 100,
    allocatedTicketQuantity: 40,
    startAt: "2027-02-10T18:00:00.000Z",
    endAt: "2027-02-10T21:00:00.000Z",
    venue: { name: "Civic Centre", address: { city: "Lagos", country: "Nigeria" } },
    organization,
    createdBy: { firstName: "Ada", lastName: "Organizer" },
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  };
  const regular = {
    id: ticketTypeId,
    name: "Regular",
    description: "General admission",
    price: 2500,
    currency: "NGN",
    quantity: 70,
    soldQuantity: 40,
    issuedQuantity: 40,
    remainingQuantity: 30,
    maxPerOrder: 10,
    status: "ACTIVE",
    configuredStatus: "ACTIVE",
    availability: "AVAILABLE",
    position: 0,
  };
  const vip = {
    ...regular,
    id: "64b64b64b64b64b64b64b903",
    name: "VIP",
    quantity: 30,
    soldQuantity: 0,
    issuedQuantity: 0,
    remainingQuantity: 30,
    position: 1,
  };

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api", "");
    if (path === "/auth/me") {
      return route.fulfill({
        json: response({
          user: {
            _id: "64b64b64b64b64b64b64b911",
            firstName: "Ada",
            lastName: "Organizer",
            role: "ADMIN",
            accountStatus: "ACTIVE",
            organization,
          },
          organizationPermissions: ["ORGANIZATION_UPDATE", "ORGANIZATION_VIEW", "DASHBOARD_VIEW"],
        }),
      });
    }
    if (path === `/organizations/me/events/${eventId}`) {
      return route.fulfill({ json: response({ event: staleEvent }) });
    }
    if (path === `/organizations/me/events/${eventId}/ticket-types` && request.method() === "GET") {
      return route.fulfill({
        json: response({
          ticketTypes: [regular, vip],
          inventory: {
            eventCapacity: 150,
            allocatedQuantity: 100,
            issuedQuantity: 40,
            unallocatedQuantity: 50,
          },
          pagination: { page: 1, totalPages: 1, totalItems: 2 },
        }),
      });
    }
    if (path === `/organizations/me/events/${eventId}/ticket-types/${ticketTypeId}` && request.method() === "PATCH") {
      allocationPatch = request.postDataJSON();
      return route.fulfill({
        json: response({
          ticketType: {
            ...regular,
            quantity: allocationPatch.quantity,
            remainingQuantity: allocationPatch.quantity - regular.issuedQuantity,
          },
        }),
      });
    }
    if (path === "/notifications/unread-count") {
      return route.fulfill({ json: response({ unreadCount: 0 }) });
    }
    return route.fulfill({ json: response({ orders: [], managers: [], history: [], attendance: [], pagination: { page: 1, totalPages: 0, totalItems: 0 } }) });
  });

  await page.goto(`/organization/events/${eventId}`);
  await expect(page.getByText("Event capacity").locator("..").getByText("150")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Edit" }).first().click();
  await page.getByLabel("Allocation").fill("100");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => allocationPatch?.quantity).toBe(100);
  await expect(page.getByText(/Total ticket allocation cannot exceed/)).toHaveCount(0);
});
