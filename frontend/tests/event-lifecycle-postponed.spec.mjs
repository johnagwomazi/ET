import { expect, test } from "@playwright/test";

test.setTimeout(180_000);

const eventId = "64b64b64b64b64b64b64ba01";
const response = (data) => ({ success: true, message: "Operation successful", data });
const organization = {
  _id: "64b64b64b64b64b64b64ba02",
  organizationName: "Lifecycle Events",
  status: "ACTIVE",
};
const postponedEvent = {
  _id: eventId,
  id: eventId,
  eventName: "Postponed Summit",
  slug: "postponed-summit",
  description: "Lifecycle action test.",
  status: "POSTPONED",
  capacity: 100,
  startAt: "2026-08-10T09:00:00.000Z",
  endAt: "2026-08-10T18:00:00.000Z",
  venue: { name: "Main Hall", address: { city: "Lagos", country: "Nigeria" } },
  organization,
  createdBy: { firstName: "Ada", lastName: "Organizer" },
  lifecycle: { action: "postpone", reason: "Venue unavailable" },
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-02T10:00:00.000Z",
};

async function installMocks(page) {
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api", "");
    if (path === "/auth/me") {
      return route.fulfill({
        json: response({
          user: {
            _id: "64b64b64b64b64b64b64ba03",
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
      return route.fulfill({ json: response({ event: postponedEvent }) });
    }
    if (path === `/organizations/me/events/${eventId}/history`) {
      return route.fulfill({
        json: response({
          history: [],
          pagination: { page: 1, totalPages: 0, totalItems: 0 },
        }),
      });
    }
    if (path === `/organizations/me/events/${eventId}/ticket-types`) {
      return route.fulfill({
        json: response({
          ticketTypes: [],
          inventory: { eventCapacity: 100, allocatedQuantity: 0, issuedQuantity: 0, unallocatedQuantity: 100 },
          pagination: { page: 1, totalPages: 0, totalItems: 0 },
        }),
      });
    }
    if (path === "/notifications/unread-count") {
      return route.fulfill({ json: response({ unreadCount: 0 }) });
    }
    return route.fulfill({
      json: response({
        orders: [],
        managers: [],
        history: [],
        attendance: [],
        records: [],
        summary: {},
        count: 0,
        pagination: { page: 1, totalPages: 0, totalItems: 0 },
      }),
    });
  });
}

async function expectPostponedActions(page) {
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole("button", { name: "Postpone", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as Completed", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel Event", exact: true })).toBeVisible();
}

test("postponed event shows all lifecycle actions and reuses postponement information", async ({ page }) => {
  await installMocks(page);
  await page.goto(`/organization/events/${eventId}`, { waitUntil: "commit" });
  await expectPostponedActions(page);

  await page.getByRole("button", { name: "Postpone", exact: true }).click();
  await expect(page.getByLabel("New start date and time")).not.toHaveValue("");
  await expect(page.getByLabel("New end date and time")).not.toHaveValue("");
  await expect(page.getByPlaceholder("Explain why the event is being postponed...")).toHaveValue("Venue unavailable");
});

test.describe("mobile postponed lifecycle actions", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("keeps resume, postpone, complete, and cancel accessible", async ({ page }) => {
    await installMocks(page);
    await page.goto(`/organization/events/${eventId}`, { waitUntil: "commit" });
    await expectPostponedActions(page);
  });
});
