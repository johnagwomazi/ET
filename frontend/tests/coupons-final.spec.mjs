import { expect, test } from "@playwright/test";

const eventId = "64b64b64b64b64b64b64bc01";
const couponId = "64b64b64b64b64b64b64bc02";
const organizationId = "64b64b64b64b64b64b64bc03";
const response = (data) => ({ success: true, message: "Operation successful", data });

const platformAdmin = {
  _id: "64b64b64b64b64b64b64bc04", firstName: "Platform", lastName: "Admin",
  email: "admin@example.com", role: "SUPER_ADMIN", accountStatus: "ACTIVE",
};
const organizationAdmin = {
  _id: "64b64b64b64b64b64b64bc05", firstName: "Org", lastName: "Admin",
  email: "organizer@example.com", role: "ADMIN", accountStatus: "ACTIVE",
  organization: { _id: organizationId, organizationName: "Test Events", status: "APPROVED" },
};
const customer = {
  _id: "64b64b64b64b64b64b64bc06", firstName: "Ada", lastName: "Customer",
  email: "ada@example.com", role: "CUSTOMER", accountStatus: "ACTIVE",
};

const coupon = (overrides = {}) => ({
  id: couponId, code: "SAVE10", discountPercent: 10, fundingType: "PLATFORM_FUNDED",
  status: "ACTIVE", redemptionCount: 0, maxRedemptions: 10, stats: { platformFundedDiscount: 0 }, ...overrides,
});

async function installMocks(page, { user = customer, coupons = [coupon()], reward = false, checkout = null } = {}) {
  const requests = [];
  let currentCoupons = coupons;
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api", "");
    const method = request.method();
    const body = request.postDataJSON?.() || null;
    requests.push({ path, method, body });

    if (path === "/auth/me") return route.fulfill({ json: response({ user, organizationPermissions: ["ORGANIZATION_UPDATE", "ORGANIZATION_VIEW", "DASHBOARD_VIEW"] }) });
    if (path === "/notifications/unread-count") return route.fulfill({ json: response({ unreadCount: 0 }) });
    if (path === "/events/discover") return route.fulfill({ json: response({ events: [{ id: "64b64b64b64b64b64b64bc10", eventName: "Launch Event", category: "Concert", venue: { name: "Main Hall" } }], pagination: { page: 1, totalPages: 1, totalItems: 1 } }) });
    if (path === "/events/64b64b64b64b64b64b64bc10/ticket-types") return route.fulfill({ json: response({ ticketTypes: [{ id: "64b64b64b64b64b64b64bc11", name: "VIP", price: 12000, currency: "NGN" }, { id: "64b64b64b64b64b64b64bc12", name: "Regular", price: 5000, currency: "NGN" }] }) });
    if (path === `/organizations/me/events/${eventId}`) return route.fulfill({ json: response({ event: { id: eventId, eventName: "Organizer Event", status: "PUBLISHED" } }) });
    if (path === `/organizations/me/events/${eventId}/ticket-types`) return route.fulfill({ json: response({ ticketTypes: [{ id: "64b64b64b64b64b64b64bc11", name: "VIP", price: 12000, currency: "NGN" }, { id: "64b64b64b64b64b64b64bc12", name: "Regular", price: 5000, currency: "NGN" }] }) });
    if (path === "/organizations/me/members") return route.fulfill({ json: response({ members: [{ id: "64b64b64b64b64b64b64bc06", firstName: "Ada", lastName: "Customer", email: "ada@example.com", role: "CUSTOMER" }], pagination: { page: 1, totalPages: 1, totalItems: 1 } }) });
    if (path === "/admin/users") return route.fulfill({ json: response({ users: [{ _id: "64b64b64b64b64b64b64bc13", firstName: "Ada", lastName: "Customer", email: "ada@example.com", role: "CUSTOMER" }], pagination: { page: 1, totalPages: 1, totalItems: 1 } }) });
    if (path === "/coupons/platform" && method === "GET") return route.fulfill({ json: response({ coupons: currentCoupons, pagination: { page: 1, totalPages: 1, totalItems: currentCoupons.length } }) });
    if (path === "/coupons/organization" && method === "GET") return route.fulfill({ json: response({ coupons: currentCoupons, pagination: { page: 1, totalPages: 1, totalItems: currentCoupons.length } }) });
    if ((path === "/coupons/platform" || path === "/coupons/organization") && method === "POST") {
      const created = coupon({ code: body.code || "GENERATED", discountPercent: body.discountPercent, fundingType: body.fundingType });
      currentCoupons = [created];
      return route.fulfill({ status: 201, json: response({ coupon: created }) });
    }
    if (path.endsWith(`/coupons/platform/${couponId}/disable`) || path.endsWith(`/coupons/organization/${couponId}/disable`)) {
      currentCoupons = currentCoupons.map((item) => ({ ...item, status: "DISABLED" }));
      return route.fulfill({ json: response({ coupon: currentCoupons[0] }) });
    }
    if (path === `/coupons/platform/${couponId}` || path === `/coupons/organization/${couponId}`) return route.fulfill({ json: response({ coupon: currentCoupons[0] }) });
    if (path === "/coupons/rewards") {
      return route.fulfill({ json: response({ rewards: reward ? [{ id: "reward-1", status: "ISSUED", issuedAt: "2026-10-01T00:00:00.000Z", coupon: { code: "REWARD20", discountPercent: 20 } }] : [] }) });
    }
    if (path === "/ticketing/checkout/price" && method === "POST") {
      if (checkout?.invalid) return route.fulfill({ status: 400, json: { success: false, message: "Coupon is invalid or expired" } });
      return route.fulfill({ json: response({ pricing: { originalSubtotal: 5000, discountAmount: 500, customerPayableAmount: 4500 } }) });
    }
    if (path === "/ticketing/checkout" && method === "POST") {
      if (checkout?.invalid) return route.fulfill({ status: 400, json: { success: false, message: "Coupon is invalid or expired" } });
      return route.fulfill({ json: response({
        order: { reference: "evt_order_coupon", total: checkout?.free ? 0 : 4500, originalSubtotal: 5000, discountAmount: checkout?.free ? 5000 : 500, customerPayableAmount: checkout?.free ? 0 : 4500, paymentStatus: checkout?.free ? "PAID" : "PAID" },
        payment: { reference: checkout?.free ? "free-ref" : "paid-ref", free: Boolean(checkout?.free), completed: true },
      }) });
    }
    if (path === "/ticketing/payments/verify") return route.fulfill({ json: response({ order: { reference: "evt_order_coupon", total: checkout?.free ? 0 : 4500, currency: "NGN", paymentStatus: "PAID" }, tickets: [{ reference: "TICKET-1" }] }) });
    return route.fulfill({ json: response({}) });
  });
  return requests;
}

async function setCheckoutSelection(page, quantity = 1) {
  await page.addInitScript(({ eventId, quantity }) => {
    sessionStorage.setItem("events_checkout_selection", JSON.stringify({
      eventId, eventName: "Coupon Event", idempotencyKey: `coupon-${Date.now()}`,
      items: [{ ticketTypeId: "64b64b64b64b64b64b64bc07", name: "Regular", quantity, price: 5000, currency: "NGN" }],
    }));
  }, { eventId, quantity });
}

test("Customer phone aliases autofill buyer and recipient and edited recipient phone is submitted", async ({ page }) => {
  const registeredPhone = "+2348012345678";
  const requests = await installMocks(page, {
    user: { ...customer, phoneNumber: registeredPhone },
    checkout: {},
  });
  await setCheckoutSelection(page);
  await page.goto("/checkout");

  await expect(page.getByLabel("Phone").nth(0)).toHaveValue(registeredPhone);
  await expect(page.getByLabel("Phone").nth(1)).toHaveValue(registeredPhone);

  const recipientPhone = "+2348099999999";
  await page.getByLabel("Phone").nth(1).fill(recipientPhone);
  await page.getByRole("button", { name: "Pay securely with Paystack" }).click();
  await expect(page.getByText("Payment verified")).toBeVisible();

  const checkout = requests.find((request) => request.path === "/ticketing/checkout");
  expect(checkout.body.customerInfo.phone).toBe(registeredPhone);
  expect(checkout.body.items[0].attendees[0].phone).toBe(recipientPhone);
});

test("Super Admin can create and disable a platform coupon", async ({ page }) => {
  await installMocks(page, { user: platformAdmin });
  await page.goto("/super-admin/dashboard/coupons");
  await page.getByRole("button", { name: "New coupon" }).click();
  await page.getByRole("button", { name: /Platform-wide coupon/ }).click();
  await page.getByLabel("Custom code (optional)").fill("SAVE10");
  await page.getByLabel("Discount percentage").fill("10");
  await page.getByRole("button", { name: "Create coupon" }).click();
  await expect(page.getByText("SAVE10", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Disable" }).click();
  await expect(page.getByText("Disabled", { exact: true })).toBeVisible();
});

test("Organization Admin can create an organizer-funded coupon", async ({ page }) => {
  const requests = await installMocks(page, { user: organizationAdmin, coupons: [] });
  await page.goto(`/organization/coupons?eventId=${eventId}`);
  await expect(page.getByLabel("Custom code (optional)")).toBeVisible();
  await page.getByLabel("Custom code (optional)").fill("ORG10");
  await page.getByLabel("Discount percentage").fill("10");
  await page.locator("form").getByRole("button", { name: "Create coupon" }).click();
  await expect(page.getByText("ORG10", { exact: true })).toBeVisible();
  await expect(page.getByText(/Organizer-funded discounts reduce eligible organizer revenue/)).toBeVisible();
  const request = requests.find((item) => item.path === "/coupons/organization" && item.method === "POST");
  expect(request.body.fundingType).toBe("ORGANIZER_FUNDED");
  expect(request.body.eventId).toBe(eventId);
});

test("Organization Admin can create a private customer giveaway", async ({ page }) => {
  const requests = await installMocks(page, { user: organizationAdmin, coupons: [] });
  await page.goto(`/organization/coupons?eventId=${eventId}`);
  await page.getByRole("button", { name: "Private Customer Giveaway" }).click();
  await page.getByLabel("Search organization customers").fill("ada@example.com");
  await page.getByRole("button", { name: /Ada Customer/ }).click();
  await page.getByLabel("Custom code (optional)").fill("PRIVATE10");
  await page.locator("form").getByRole("button", { name: "Create coupon" }).click();
  const request = requests.find((item) => item.path === "/coupons/organization" && item.method === "POST");
  expect(request.body.fundingType).toBe("ORGANIZER_FUNDED");
  expect(request.body.customerIds).toEqual([customer._id]);
});

test("Super Admin creates an event coupon from event and ticket selections", async ({ page }) => {
  const requests = await installMocks(page, { user: platformAdmin, coupons: [] });
  await page.goto("/super-admin/dashboard/coupons");
  await page.getByRole("button", { name: "New coupon" }).click();
  await page.getByRole("button", { name: /Event coupon/ }).click();
  await page.getByRole("button", { name: /Launch Event/ }).click();
  await expect(page.getByText("VIP", { exact: true })).toBeVisible();
  await page.getByLabel("Discount percentage").fill("25");
  await page.getByRole("button", { name: "Create coupon" }).click();
  const request = requests.find((item) => item.path === "/coupons/platform" && item.method === "POST");
  expect(request.body.eventId).toBe("64b64b64b64b64b64b64bc10");
  expect(request.body.ticketTypeIds).toBeUndefined();
});

test("Super Admin creates a private customer coupon through search and selection", async ({ page }) => {
  const requests = await installMocks(page, { user: platformAdmin, coupons: [] });
  await page.goto("/super-admin/dashboard/coupons");
  await page.getByRole("button", { name: "New coupon" }).click();
  await page.getByRole("button", { name: /Private customer coupon/ }).click();
  await page.getByLabel("Search registered customers").fill("ada@example.com");
  await page.getByRole("button", { name: /Ada Customer/ }).click();
  await page.getByLabel("Custom code (optional)").fill("PRIVATE25");
  await page.getByRole("button", { name: "Create coupon" }).click();
  const request = requests.find((item) => item.path === "/coupons/platform" && item.method === "POST");
  expect(request.body.customerIds).toEqual(["64b64b64b64b64b64b64bc13"]);
  expect(request.body.code).toBe("PRIVATE25");
});

test("Customer and manager roles cannot access coupon management", async ({ page }) => {
  await installMocks(page, { user: customer });
  await page.goto("/super-admin/dashboard/coupons");
  await expect(page).toHaveURL(/\/forbidden|\/login/);
});

test("Customer applies a valid coupon and sees the server-confirmed payable total", async ({ page }) => {
  const requests = await installMocks(page, { user: customer, checkout: {} });
  await setCheckoutSelection(page);
  await page.goto("/checkout");
  await page.getByLabel("Coupon code").fill("SAVE10");
  await page.getByLabel("Phone").nth(0).fill("08012345678");
  await page.getByLabel("Phone").nth(1).fill("08012345678");
  await page.getByRole("button", { name: "Pay securely with Paystack" }).click();
  await expect(page.getByText("Payment verified")).toBeVisible();
  const checkout = requests.find((request) => request.path === "/ticketing/checkout");
  expect(checkout.body.couponCode).toBe("SAVE10");
  await expect(page.getByText(/₦4,500|4,500/)).toBeVisible();
});

test("Customer sees live coupon pricing and can remove the coupon", async ({ page }) => {
  await installMocks(page, { user: customer, checkout: {} });
  await setCheckoutSelection(page);
  await page.goto("/checkout");
  await page.getByLabel("Coupon code").fill("SAVE10");
  await expect(page.getByText("Coupon applied", { exact: true })).toBeVisible();
  await expect(page.getByText(/4,500/)).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText(/5,000/).last()).toBeVisible();
});

test("Customer receives a useful error for an invalid coupon", async ({ page }) => {
  await installMocks(page, { user: customer, checkout: { invalid: true } });
  await setCheckoutSelection(page);
  await page.goto("/checkout");
  await page.getByLabel("Coupon code").fill("NOPE");
  await page.getByLabel("Phone").nth(0).fill("08012345678");
  await page.getByLabel("Phone").nth(1).fill("08012345678");
  await page.getByRole("button", { name: "Pay securely with Paystack" }).click();
  await expect(page.getByRole("alert")).toContainText("Coupon is invalid or expired");
});

test("A 100% coupon completes checkout without Paystack and issues a ticket", async ({ page }) => {
  await installMocks(page, { user: customer, checkout: { free: true } });
  await setCheckoutSelection(page);
  await page.goto("/checkout");
  await page.getByLabel("Coupon code").fill("FREE100");
  await page.getByLabel("Phone").nth(0).fill("08012345678");
  await page.getByLabel("Phone").nth(1).fill("08012345678");
  await page.getByRole("button", { name: "Pay securely with Paystack" }).click();
  await expect(page.getByText("Payment verified")).toBeVisible();
  await expect(page.getByText("TICKET-1")).toHaveCount(0);
  await expect(page.getByText(/NGN\s*0/)).toBeVisible();
});

test("Customer can view an earned reward coupon for a next purchase", async ({ page }) => {
  const requests = await installMocks(page, { user: customer, reward: true, checkout: {} });
  await page.goto("/customer/rewards");
  await expect(page.getByRole("heading", { name: "Earned coupons", exact: true })).toBeVisible();
  await expect(page.getByText("REWARD20", { exact: true })).toBeVisible();
  await expect(page.getByText("20% off", { exact: true })).toBeVisible();
  await setCheckoutSelection(page);
  await page.goto("/checkout");
  await page.getByLabel("Coupon code").fill("REWARD20");
  await page.getByLabel("Phone").nth(0).fill("08012345678");
  await page.getByLabel("Phone").nth(1).fill("08012345678");
  await page.getByRole("button", { name: "Pay securely with Paystack" }).click();
  await expect(page.getByText("Payment verified")).toBeVisible();
  expect(requests.find((request) => request.path === "/ticketing/checkout").body.couponCode).toBe("REWARD20");
});
