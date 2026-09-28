import test from "node:test";
import assert from "node:assert/strict";

import { EVENT_STATUS } from "../src/constants/eventStatus.constants.js";
import { getDashboardOverview } from "../src/services/adminDashboard.service.js";

function createDependencies(captures = {}) {
  return {
    userRepository: {
      async countUsers(filter) {
        if (filter.role === "CUSTOMER") return 7;
        if (filter.role === "ADMIN") return 2;
        if (filter.role === "MANAGER") return 1;
        return 10;
      },
      async findUsers() { return []; },
    },
    organizationRepository: {
      async countOrganizations(filter) {
        if (filter.status === "ACTIVE") return 2;
        if (filter.status === "SUSPENDED") return 1;
        return 3;
      },
      async findOrganizations() {
        return [{ _id: "organization-1", organizationName: "Acme Events", createdAt: new Date("2026-09-25T10:00:00.000Z") }];
      },
    },
    eventRepository: {
      async countEvents(filter = {}) {
        if (filter.status) {
          captures.activeEventFilter = filter;
          return 2;
        }
        return 5;
      },
      async findEvents() {
        return [{ _id: "event-1", eventName: "Launch Night", status: EVENT_STATUS.PUBLISHED, createdAt: new Date("2026-09-26T10:00:00.000Z") }];
      },
    },
    orderRepository: {
      async findOrders(filter) {
        captures.paidOrderFilter = filter;
        return [{
          _id: "order-1",
          event: { eventName: "Launch Night" },
          items: [{ quantity: 2 }],
          paidAt: new Date("2026-09-27T10:00:00.000Z"),
        }];
      },
    },
  };
}

test("Super Admin dashboard returns real event totals and current active-event count", async () => {
  const captures = {};
  const now = new Date("2026-09-28T12:00:00.000Z");
  const result = await getDashboardOverview(createDependencies(captures), now);

  assert.equal(result.totalUsers, 10);
  assert.equal(result.totalOrganizations, 3);
  assert.equal(result.totalEvents, 5);
  assert.equal(result.activeEvents, 2);
  assert.deepEqual(captures.activeEventFilter.status.$in, [EVENT_STATUS.PUBLISHED, EVENT_STATUS.POSTPONED]);
  assert.equal(captures.activeEventFilter.endAt.$gt, now);
});

test("Super Admin recent activity combines real records in reverse chronological order", async () => {
  const result = await getDashboardOverview(createDependencies(), new Date("2026-09-28T12:00:00.000Z"));

  assert.deepEqual(result.recentActivity.map((activity) => activity.type), [
    "TICKET_PURCHASED",
    "EVENT_CREATED",
    "ORGANIZATION_CREATED",
  ]);
  assert.equal(result.recentActivity[0].description, "2 tickets purchased for Launch Night.");
});
