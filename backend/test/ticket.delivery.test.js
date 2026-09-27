import assert from "node:assert/strict";
import test from "node:test";
import * as ticketingService from "../src/services/ticketing.service.js";
import { buildEmailVerificationEmail, buildPurchaseConfirmationEmail, buildTicketAssignmentEmail } from "../src/services/email.service.js";
import { hashToken } from "../src/utils/token.util.js";

const ids = {
  purchaser: "64b64b64b64b64b64b64b641",
  recipient: "64b64b64b64b64b64b64b642",
  ticket: "64b64b64b64b64b64b64b643",
};

function createHarness() {
  const emails = [];
  let writes = 0;
  const ticket = {
    _id: ids.ticket,
    reference: "tkt_original",
    checkInCode: "0123456789",
    qrToken: "existing-qr-token",
    qrCodeDataUrl: "data:image/png;base64,existing-qr",
    purchaser: ids.purchaser,
    assignedTo: ids.purchaser,
    assignmentUpdatedAt: null,
    guestAccessTokenHash: null,
    source: "PAID",
    status: "VALID",
    checkedInAt: null,
    attendee: { name: "Ada Buyer", email: "ada@example.com", phone: "+2348012345678" },
    event: { _id: "64b64b64b64b64b64b64b644", eventName: "Eventidor Live", status: "PUBLISHED", startAt: new Date("2027-01-10T18:00:00Z"), venue: { name: "Civic Centre" } },
    ticketType: { _id: "64b64b64b64b64b64b64b645", name: "VIP", price: 5000, currency: "NGN" },
    order: { _id: "64b64b64b64b64b64b64b646", reference: "ord_original", total: 5000, currency: "NGN", paymentStatus: "PAID", orderStatus: "PAID", customerInfo: { name: "Ada Buyer" } },
  };
  const users = {
    "ada@example.com": { _id: ids.purchaser, firstName: "Ada", lastName: "Buyer", email: "ada@example.com" },
    "recipient@example.com": { _id: ids.recipient, firstName: "Reni", lastName: "Guest", email: "recipient@example.com" },
  };
  const dependencies = {
    authRepository: {
      async findAuthUserById(id) { return Object.values(users).find((user) => user._id === id) || null; },
      async findAuthUserByEmail(email) { return users[email] || null; },
    },
    ticketRepository: {
      async findTicketForAssignment(id, purchaser) { return id === ticket._id && purchaser === ticket.purchaser ? ticket : null; },
      async assignTicket(id, purchaser, assignment) {
        if (id !== ticket._id || purchaser !== ticket.purchaser || ticket.status !== "VALID" || ticket.checkedInAt) return null;
        writes += 1;
        Object.assign(ticket, {
          attendee: assignment.attendee,
          assignedTo: assignment.assignedTo || null,
          assignmentUpdatedAt: assignment.assignedAt,
          guestAccessTokenHash: assignment.guestAccessTokenHash || null,
        });
        return ticket;
      },
      async findTicketByGuestAccessTokenHash(value) { return ticket.guestAccessTokenHash === value ? ticket : null; },
      async findTickets(filter) {
        const viewer = filter.$or?.[0]?.purchaser;
        return ticket.purchaser === viewer || ticket.assignedTo === viewer ? [ticket] : [];
      },
      async countTickets(filter) { return (await this.findTickets(filter)).length; },
    },
    emailService: { async sendTicketAssignmentEmail(input) { emails.push(input); return { sent: true }; } },
  };
  return { ticket, dependencies, emails, get writes() { return writes; } };
}

test("guest assignment stores only a hashed token and guest access exposes one privacy-safe ticket", async () => {
  const harness = createHarness();
  const assigned = await ticketingService.assignCustomerTicket(ids.purchaser, ids.ticket, { name: "Guest", email: "guest@example.com", phone: "+2348099999999" }, harness.dependencies);
  const rawToken = new URL(harness.emails[0].ticketUrl).pathname.split("/").at(-1);
  assert.match(rawToken, /^[a-f0-9]{64}$/);
  assert.equal(harness.ticket.guestAccessTokenHash, hashToken(rawToken));
  assert.equal(assigned.ticket.reference, "tkt_original");
  assert.equal(assigned.ticket.checkInCode, "0123456789");
  assert.equal(JSON.stringify(assigned).includes(rawToken), false);
  const guest = await ticketingService.getGuestTicket(rawToken, harness.dependencies);
  assert.equal(guest.ticket.reference, "tkt_original");
  assert.equal(guest.ticket.qrCodeDataUrl, harness.ticket.qrCodeDataUrl);
  for (const field of ["id", "order", "purchaser", "organization", "qrToken"]) assert.equal(Object.hasOwn(guest.ticket, field), false);
  assert.equal(Object.hasOwn(guest.ticket.eventDetails, "id"), false);
  assert.equal(Object.hasOwn(guest.ticket.ticketTypeDetails, "id"), false);
  assert.equal(Object.hasOwn(guest.ticket.attendee, "email"), false);
  const changed = `${rawToken[0] === "a" ? "b" : "a"}${rawToken.slice(1)}`;
  assert.equal((await ticketingService.getGuestTicket(changed, harness.dependencies)).statusCode, 404);
});

test("reassignment revokes guest access and moves account visibility without duplicating the ticket", async () => {
  const harness = createHarness();
  await ticketingService.assignCustomerTicket(ids.purchaser, ids.ticket, { name: "Guest", email: "guest@example.com", phone: "+2348099999999" }, harness.dependencies);
  const oldToken = new URL(harness.emails[0].ticketUrl).pathname.split("/").at(-1);
  const result = await ticketingService.assignCustomerTicket(ids.purchaser, ids.ticket, { name: "Reni", email: "recipient@example.com", phone: "+2348088888888" }, harness.dependencies);
  assert.equal(result.recipientHasAccount, true);
  assert.equal(harness.ticket.assignedTo, ids.recipient);
  assert.equal(harness.ticket.guestAccessTokenHash, null);
  assert.equal(harness.writes, 2);
  assert.equal((await ticketingService.getGuestTicket(oldToken, harness.dependencies)).statusCode, 404);
  const recipientTickets = await ticketingService.getCustomerTickets(ids.recipient, {}, harness.dependencies);
  assert.equal(recipientTickets.tickets.length, 1);
  assert.equal(recipientTickets.tickets[0].assignment.canAssign, false);
  const purchaserTickets = await ticketingService.getCustomerTickets(ids.purchaser, {}, harness.dependencies);
  assert.equal(purchaserTickets.tickets[0].assignment.canAssign, true);
  assert.equal((await ticketingService.assignCustomerTicket(ids.recipient, ids.ticket, { name: "No", email: "no@example.com", phone: "+2348077777777" }, harness.dependencies)).statusCode, 404);
});

test("checked-in tickets cannot be reassigned", async () => {
  const harness = createHarness();
  harness.ticket.status = "USED";
  harness.ticket.checkedInAt = new Date();
  const result = await ticketingService.assignCustomerTicket(ids.purchaser, ids.ticket, { name: "Guest", email: "guest@example.com", phone: "+2348099999999" }, harness.dependencies);
  assert.equal(result.statusCode, 409);
  assert.equal(harness.writes, 0);
});

test("Eventidor ticket and verification emails use custom branded templates", () => {
  const event = { eventName: "Eventidor Live", startAt: "2027-01-10T18:00:00Z", venue: { name: "Civic Centre" } };
  const purchase = buildPurchaseConfirmationEmail({ buyerName: "Ada", event, order: { items: [{ name: "VIP", quantity: 2 }], total: 10000, currency: "NGN" }, myTicketsUrl: "https://eventidor.example/customer/tickets" });
  const assignment = buildTicketAssignmentEmail({ recipientName: "Reni", senderName: "Ada", event, ticketType: { name: "VIP" }, ticketUrl: "https://eventidor.example/tickets/access/token", isGuest: true });
  const verification = buildEmailVerificationEmail({ firstName: "Ada", code: "123456", expiresInMinutes: 10 });
  assert.match(purchase.subject, /tickets for Eventidor Live are ready/);
  assert.match(purchase.html, /Eventidor/);
  assert.match(purchase.text, /My Tickets/);
  assert.match(assignment.text, /don't need an account/);
  assert.match(assignment.html, /VIEW MY TICKET/);
  assert.match(verification.html, /Welcome! Let&#039;s verify your email/);
  assert.match(verification.text, /123456/);
  assert.match(verification.text, /10 minutes/);
});
