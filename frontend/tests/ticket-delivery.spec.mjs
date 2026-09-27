import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

const token = "a".repeat(64);
const ticket = {
  id: "64b64b64b64b64b64b64b643",
  reference: "tkt_eventidor",
  checkInCode: "0123456789",
  source: "PAID",
  event: "64b64b64b64b64b64b64b644",
  eventDetails: { eventName: "Eventidor Live", startAt: "2027-01-10T18:00:00Z", status: "PUBLISHED", venue: { name: "Civic Centre", address: { city: "Lagos" } } },
  ticketTypeDetails: { name: "VIP", price: 5000, currency: "NGN" },
  orderDetails: { total: 5000, currency: "NGN", paymentStatus: "PAID" },
  attendee: { name: "Ada Buyer", email: "ada@example.com", phone: "+2348012345678" },
  assignment: { canAssign: true, isAssigned: false, recipientType: "PURCHASER" },
  status: "VALID",
  qrCodeDataUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200'/%3E%3C/svg%3E",
};

const response = (data) => ({ success: true, message: "Operation successful", data });

test("authenticated ticket assignment and QR enlargement work", async ({ page }) => {
  let assignmentBody;
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api", "");
    if (path === "/auth/me") return route.fulfill({ json: response({ user: { _id: "64b64b64b64b64b64b64b641", firstName: "Ada", role: "CUSTOMER", accountStatus: "ACTIVE" }, organizationPermissions: [] }) });
    if (path === "/notifications/unread-count") return route.fulfill({ json: response({ unreadCount: 0 }) });
    if (path === "/ticketing/tickets" && request.method() === "GET") return route.fulfill({ json: response({ tickets: [ticket], pagination: { page: 1, totalPages: 1, totalItems: 1 } }) });
    if (path.endsWith("/assignment") && request.method() === "PATCH") {
      assignmentBody = request.postDataJSON();
      return route.fulfill({ json: response({ ticket: { ...ticket, attendee: assignmentBody, assignment: { canAssign: true, isAssigned: true, recipientType: "GUEST" } }, recipientHasAccount: false, emailSent: true }) });
    }
    return route.fulfill({ json: response({}) });
  });

  await page.goto("/customer/tickets");
  await page.getByRole("button", { name: "Assign" }).click();
  await page.getByLabel("Recipient name").fill("Reni Guest");
  await page.getByLabel("Recipient email").fill("reni@example.com");
  await page.getByLabel("Recipient phone number").fill("+2348099999999");
  await page.getByRole("button", { name: "Assign ticket" }).click();
  await expect.poll(() => assignmentBody?.email).toBe("reni@example.com");
  await expect(page.getByText("Assigned to Reni Guest")).toBeVisible();

  await page.getByRole("button", { name: "Enlarge QR code for tkt_eventidor" }).click();
  await expect(page.getByRole("dialog")).toContainText("0123456789");
  await expect(page.getByRole("dialog")).toContainText("Reni Guest");
});

test.describe("mobile guest ticket", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("opens without authentication and enlarges the same QR and manual code", async ({ page }) => {
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api", "");
      if (path === `/tickets/access/${token}`) return route.fulfill({ json: response({ ticket: { ...ticket, id: undefined, event: undefined, orderDetails: undefined, assignment: undefined } }) });
      if (path === "/auth/me") return route.fulfill({ status: 401, json: { success: false, message: "Not authorized" } });
      return route.fulfill({ json: response({}) });
    });

    await page.goto(`/tickets/access/${token}`);
    await expect(page.getByRole("heading", { name: "Your event ticket" })).toBeVisible();
    await page.getByRole("button", { name: "Enlarge QR code for tkt_eventidor" }).click();
    await expect(page.getByRole("dialog")).toContainText("Eventidor Live");
    await expect(page.getByRole("dialog")).toContainText("0123456789");
    await expect(page.getByRole("dialog").locator("img")).toHaveAttribute("src", ticket.qrCodeDataUrl);
  });
});
