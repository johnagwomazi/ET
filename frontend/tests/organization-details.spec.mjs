import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

const organizationId = "64b64b64b64b64b64b64b801";

function apiResponse(data) {
  return { success: true, message: "Operation successful", data };
}

function detailsPayload(status = "APPROVED") {
  const organization = {
    _id: organizationId,
    organizationName: "Acme Events",
    businessEmail: "hello@acme.test",
    businessPhone: "+2348000000000",
    website: "https://acme.test",
    address: "1 Event Avenue, Lagos",
    status,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
    primaryAdmin: { _id: "owner-1", firstName: "Ada", lastName: "Owner", email: "ada@acme.test" },
  };
  const pagination = { page: 1, limit: 10, totalItems: 1, totalPages: 1 };

  return {
    organization,
    summary: {
      totalEvents: 3,
      currentEvents: 2,
      ticketsSold: 42,
      grossTicketSales: 5000,
      availableBalance: 3000,
      pendingWithdrawals: 500,
      totalWithdrawn: 1000,
      currency: "NGN",
    },
    overview: { netRevenue: 4500, refunds: 500, successfulOrders: 20, salesRate: 42 },
    events: {
      items: [{ id: "event-1", eventName: "Launch Night", status: "PUBLISHED", startAt: "2026-10-01T18:00:00.000Z", endAt: "2026-10-01T22:00:00.000Z", currency: "NGN", ticketsSold: 42, grossSales: 5000, netRevenue: 4500 }],
      pagination,
    },
    ticketSales: {
      items: [{ id: "order-1", reference: "ord_details", customerInfo: { name: "Buyer One", email: "buyer@test.dev" }, eventDetails: { eventName: "Launch Night" }, items: [{ quantity: 2 }], paymentStatus: "PAID", total: 5000, currency: "NGN", paidAt: "2026-08-05T10:00:00.000Z" }],
      pagination,
    },
    finance: {
      currency: "NGN", grossSales: 5000, netRevenue: 4500, availableBalance: 3000, completedWithdrawals: 1000,
      withdrawals: [{ id: "withdrawal-1", reference: "wd_details", amount: 1000, currency: "NGN", status: "PENDING", requester: { firstName: "Ada", lastName: "Owner" }, requestedAt: "2026-08-06T10:00:00.000Z", completedAt: null }],
      pagination,
    },
    members: {
      items: [{ id: "owner-1", firstName: "Ada", lastName: "Owner", email: "ada@acme.test", role: "ADMIN", accountStatus: "ACTIVE", isOwner: true, createdAt: "2026-01-01T10:00:00.000Z" }],
      pagination,
    },
    activity: [{ id: "activity-1", type: "EVENT_CREATED", title: "Launch Night was created", description: "Event status: PUBLISHED.", occurredAt: "2026-08-01T10:00:00.000Z" }],
  };
}

async function installMocks(page) {
  const requests = [];
  let status = "APPROVED";

  await page.addInitScript(() => window.localStorage.setItem("events_access_token", "super-admin-test-token"));
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api", "");
    const body = request.postDataJSON?.() || null;
    requests.push({ method: request.method(), path, body });

    if (path === "/auth/me") {
      return route.fulfill({ json: apiResponse({ user: { _id: "super-1", firstName: "Super", lastName: "Admin", email: "super@test.dev", role: "SUPER_ADMIN", accountStatus: "ACTIVE" }, organizationPermissions: [] }) });
    }
    if (path === "/notifications/unread-count") return route.fulfill({ json: apiResponse({ unreadCount: 0 }) });
    if (path === "/admin/organizations" && request.method() === "GET") {
      return route.fulfill({ json: apiResponse({ organizations: [detailsPayload(status).organization], pagination: { page: 1, limit: 1000, totalItems: 1, totalPages: 1 } }) });
    }
    if (path === `/admin/organizations/${organizationId}/details`) {
      return route.fulfill({ json: apiResponse(detailsPayload(status)) });
    }
    if (path === `/admin/organizations/${organizationId}/suspend` && request.method() === "PATCH") {
      status = "SUSPENDED";
      return route.fulfill({ json: apiResponse({ organization: detailsPayload(status).organization }) });
    }

    return route.fulfill({ status: 404, json: { success: false, message: `Unexpected request: ${request.method()} ${path}` } });
  });

  return requests;
}

test("View opens the full organization page with real sections and preserved suspend action", async ({ page }) => {
  const requests = await installMocks(page);
  await page.goto("/super-admin/dashboard/organizations", { waitUntil: "commit" });
  await expect(page.getByRole("heading", { name: "Organizations", level: 2 })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Actions").click();
  await page.getByRole("button", { name: "View", exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/organizations/${organizationId}$`));
  await expect(page.getByRole("heading", { name: "Acme Events" })).toBeVisible();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
  await expect(page.getByText("Total Events")).toBeVisible();
  await expect(page.getByText("NGN 3,000")).toBeVisible();

  await page.getByRole("tab", { name: "Events" }).click();
  await expect(page.getByText("Launch Night", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Ticket Sales" }).click();
  await expect(page.getByText("ord_details")).toBeVisible();
  await page.getByRole("tab", { name: "Finance" }).click();
  await expect(page.getByText("wd_details")).toBeVisible();
  await page.getByRole("tab", { name: "Members" }).click();
  await expect(page.getByText("Ada Owner", { exact: true }).last()).toBeVisible();
  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByText("Launch Night was created")).toBeVisible();

  await page.getByRole("button", { name: "Suspend", exact: true }).click();
  await page.getByLabel("Reason").fill("Policy review");
  await page.getByRole("button", { name: "Suspend", exact: true }).last().click();
  await expect(page.getByRole("button", { name: "Reactivate" })).toBeVisible();
  await expect(page.getByText("Suspended", { exact: true })).toBeVisible();

  const suspendRequest = requests.find((request) => request.path.endsWith("/suspend"));
  expect(suspendRequest.body).toEqual({ suspensionReason: "Policy review" });
});

test("organization details remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installMocks(page);
  await page.goto(`/super-admin/dashboard/organizations/${organizationId}`, { waitUntil: "commit" });

  await expect(page.getByRole("heading", { name: "Acme Events" })).toBeVisible();
  await page.getByRole("tab", { name: "Events" }).click();
  await expect(page.getByText("Launch Night", { exact: true })).toBeVisible();

  const headingBox = await page.getByRole("heading", { name: "Acme Events" }).boundingBox();
  expect(headingBox.x).toBeGreaterThanOrEqual(0);
  expect(headingBox.x + headingBox.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
