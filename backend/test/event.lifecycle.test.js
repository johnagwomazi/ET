import test from "node:test";
import assert from "node:assert/strict";

import { EVENT_STATUS } from "../src/constants/eventStatus.constants.js";
import { USER_ROLES } from "../src/constants/roles.constants.js";
import {
  cancelOrganizationEvent,
  completeOrganizationEvent,
  getOrganizationEventHistory,
  postponeOrganizationEvent,
  publishOrganizationEvent,
  resumeOrganizationEvent,
} from "../src/services/event.service.js";

function createDocument(data) {
  return {
    ...data,
    toObject() {
      return { ...data };
    },
  };
}

function buildDependencies(overrides = {}) {
  const calls = {
    findAuthUserById: [],
    findOrganizationDetailsById: [],
    findEventByIdAndOrganization: [],
    updateEventByIdAndOrganizationAndStatus: [],
    createEventStatusHistory: [],
    findEventStatusHistories: [],
    countEventStatusHistories: [],
  };

  const dependencies = {
    authRepository: {
      findAuthUserById: async (userId) => {
        calls.findAuthUserById.push(userId);

        if (overrides.authUser === null) {
          return null;
        }

        return createDocument({
          _id: "user_1",
          role: USER_ROLES.ADMIN,
          organization: "org_1",
          ...overrides.authUser,
        });
      },
    },
    organizationRepository: {
      findOrganizationDetailsById: async (organizationId) => {
        calls.findOrganizationDetailsById.push(organizationId);

        if (overrides.organization === null) {
          return null;
        }

        return createDocument({
          _id: "org_1",
          status: "APPROVED",
          isDeleted: false,
          primaryAdmin: "user_1",
          ...overrides.organization,
        });
      },
    },
    eventRepository: {
      findEventByIdAndOrganization: async (eventId, organizationId) => {
        calls.findEventByIdAndOrganization.push({ eventId, organizationId });

        if (overrides.currentEvent === null) {
          return null;
        }

        if (overrides.currentEvent !== undefined) {
          return createDocument(overrides.currentEvent);
        }

        return createDocument({
          _id: eventId,
          eventName: "Annual Event Summit",
          slug: "annual-event-summit",
          description: "Annual summit for the platform.",
          category: "Conference",
          banner: {},
          venue: {
            name: "Main Hall",
          },
          startAt: new Date("2026-09-01T09:00:00.000Z"),
          endAt: new Date("2026-09-01T18:00:00.000Z"),
          capacity: 300,
          status: EVENT_STATUS.DRAFT,
          organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
          createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
          lifecycle: {},
        });
      },
      updateEventByIdAndOrganizationAndStatus: async (eventId, organizationId, status, updateData) => {
        calls.updateEventByIdAndOrganizationAndStatus.push({ eventId, organizationId, status, updateData });

        if (overrides.updatedEvent !== undefined) {
          return createDocument(overrides.updatedEvent);
        }

        return createDocument({
          _id: eventId,
          organization: createDocument({ _id: organizationId, status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
          createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: organizationId }),
          ...updateData,
        });
      },
    },
    eventStatusHistoryRepository: {
      createEventStatusHistory: async (historyData) => {
        calls.createEventStatusHistory.push(historyData);

        if (overrides.historyCreateError) {
          throw overrides.historyCreateError;
        }

        return createDocument({
          _id: overrides.historyId || "history_1",
          ...historyData,
        });
      },
      findEventStatusHistories: async (filter, options) => {
        calls.findEventStatusHistories.push({ filter, options });
        return overrides.historyRecords || [];
      },
      countEventStatusHistories: async (filter) => {
        calls.countEventStatusHistories.push(filter);
        return overrides.totalHistoryItems ?? (overrides.historyRecords ? overrides.historyRecords.length : 0);
      },
    },
  };

  return { dependencies, calls };
}

test("event lifecycle publishes a draft event", async () => {
  const { dependencies, calls } = buildDependencies();

  const result = await publishOrganizationEvent("org_1", "user_1", "event_1", dependencies);

  assert.equal(result.error, undefined);
  assert.equal(result.event.status, EVENT_STATUS.PUBLISHED);
  assert.equal(result.event.lifecycle.action, "publish");
  assert.equal(result.event.lifecycle.previousStatus, EVENT_STATUS.DRAFT);
  assert.equal(calls.updateEventByIdAndOrganizationAndStatus.length, 1);
  assert.equal(calls.createEventStatusHistory.length, 1);
  assert.equal(calls.updateEventByIdAndOrganizationAndStatus[0].status, EVENT_STATUS.DRAFT);
  assert.equal(calls.createEventStatusHistory[0].previousStatus, EVENT_STATUS.DRAFT);
  assert.equal(calls.createEventStatusHistory[0].newStatus, EVENT_STATUS.PUBLISHED);
});

test("event lifecycle postpones a published event and preserves the original schedule", async () => {
  const originalStartAt = new Date("2026-09-01T09:00:00.000Z");
  const originalEndAt = new Date("2026-09-01T18:00:00.000Z");
  const { dependencies, calls } = buildDependencies({
    currentEvent: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      description: "Annual summit for the platform.",
      category: "Conference",
      banner: {},
      venue: {
        name: "Main Hall",
      },
      startAt: originalStartAt,
      endAt: originalEndAt,
      capacity: 300,
      status: EVENT_STATUS.PUBLISHED,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      lifecycle: {},
    },
    updatedEvent: {
      _id: "event_1",
      status: EVENT_STATUS.POSTPONED,
      startAt: new Date("2026-09-15T09:00:00.000Z"),
      endAt: new Date("2026-09-15T18:00:00.000Z"),
      lifecycle: {
        action: "postpone",
        reason: "Venue maintenance",
        previousStatus: EVENT_STATUS.PUBLISHED,
        previousStartAt: originalStartAt,
        previousEndAt: originalEndAt,
        nextStartAt: new Date("2026-09-15T09:00:00.000Z"),
        nextEndAt: new Date("2026-09-15T18:00:00.000Z"),
        nextStatus: EVENT_STATUS.POSTPONED,
      },
    },
  });

  const result = await postponeOrganizationEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      reason: "Venue maintenance",
      newStartDateTime: new Date("2026-09-15T09:00:00.000Z"),
      newEndDateTime: new Date("2026-09-15T18:00:00.000Z"),
    },
    dependencies
  );

  assert.equal(result.event.status, EVENT_STATUS.POSTPONED);
  assert.equal(result.event.startAt.toISOString(), "2026-09-15T09:00:00.000Z");
  assert.equal(result.event.endAt.toISOString(), "2026-09-15T18:00:00.000Z");
  assert.equal(result.event.lifecycle.action, "postpone");
  assert.equal(result.event.lifecycle.reason, "Venue maintenance");
  assert.equal(result.event.lifecycle.previousStatus, EVENT_STATUS.PUBLISHED);
  assert.equal(result.event.lifecycle.previousStartAt.toISOString(), originalStartAt.toISOString());
  assert.equal(result.event.lifecycle.previousEndAt.toISOString(), originalEndAt.toISOString());
  assert.equal(calls.createEventStatusHistory.length, 1);
  assert.equal(calls.createEventStatusHistory[0].previousStatus, EVENT_STATUS.PUBLISHED);
  assert.equal(calls.createEventStatusHistory[0].newStatus, EVENT_STATUS.POSTPONED);
  assert.equal(calls.createEventStatusHistory[0].reason, "Venue maintenance");
  assert.equal(calls.createEventStatusHistory[0].previousStartAt.toISOString(), originalStartAt.toISOString());
  assert.equal(calls.createEventStatusHistory[0].previousEndAt.toISOString(), originalEndAt.toISOString());
  assert.equal(calls.createEventStatusHistory[0].newStartAt.toISOString(), "2026-09-15T09:00:00.000Z");
  assert.equal(calls.createEventStatusHistory[0].newEndAt.toISOString(), "2026-09-15T18:00:00.000Z");
});

test("event lifecycle resumes a postponed event", async () => {
  const { dependencies, calls } = buildDependencies({
    currentEvent: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      startAt: new Date("2026-09-15T09:00:00.000Z"),
      endAt: new Date("2026-09-15T18:00:00.000Z"),
      capacity: 300,
      status: EVENT_STATUS.POSTPONED,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      lifecycle: {},
    },
    updatedEvent: {
      _id: "event_1",
      status: EVENT_STATUS.PUBLISHED,
      lifecycle: {
        action: "resume",
        previousStatus: EVENT_STATUS.POSTPONED,
        nextStatus: EVENT_STATUS.PUBLISHED,
      },
    },
  });

  const result = await resumeOrganizationEvent("org_1", "user_1", "event_1", dependencies);

  assert.equal(result.event.status, EVENT_STATUS.PUBLISHED);
  assert.equal(result.event.lifecycle.action, "resume");
  assert.equal(result.event.lifecycle.previousStatus, EVENT_STATUS.POSTPONED);
  assert.equal(calls.createEventStatusHistory.length, 1);
  assert.equal(calls.createEventStatusHistory[0].previousStatus, EVENT_STATUS.POSTPONED);
  assert.equal(calls.createEventStatusHistory[0].newStatus, EVENT_STATUS.PUBLISHED);
});

test("event lifecycle cancels published and postponed events", async () => {
  const { dependencies: publishedDependencies, calls: publishedCalls } = buildDependencies({
    currentEvent: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      startAt: new Date("2026-09-01T09:00:00.000Z"),
      endAt: new Date("2026-09-01T18:00:00.000Z"),
      capacity: 300,
      status: EVENT_STATUS.PUBLISHED,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      lifecycle: {},
    },
    updatedEvent: {
      _id: "event_1",
      status: EVENT_STATUS.CANCELED,
      lifecycle: {
        action: "cancel",
        reason: "Venue unavailable",
        previousStatus: EVENT_STATUS.PUBLISHED,
        nextStatus: EVENT_STATUS.CANCELED,
      },
    },
  });

  const publishedResult = await cancelOrganizationEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      reason: "Venue unavailable",
    },
    publishedDependencies
  );

  assert.equal(publishedResult.event.status, EVENT_STATUS.CANCELED);
  assert.equal(publishedResult.event.lifecycle.reason, "Venue unavailable");
  assert.equal(publishedCalls.createEventStatusHistory.length, 1);
  assert.equal(publishedCalls.createEventStatusHistory[0].previousStatus, EVENT_STATUS.PUBLISHED);
  assert.equal(publishedCalls.createEventStatusHistory[0].newStatus, EVENT_STATUS.CANCELED);
  assert.equal(publishedCalls.createEventStatusHistory[0].reason, "Venue unavailable");

  const { dependencies: postponedDependencies, calls: postponedCalls } = buildDependencies({
    currentEvent: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      startAt: new Date("2026-09-15T09:00:00.000Z"),
      endAt: new Date("2026-09-15T18:00:00.000Z"),
      capacity: 300,
      status: EVENT_STATUS.POSTPONED,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      lifecycle: {},
    },
    updatedEvent: {
      _id: "event_1",
      status: EVENT_STATUS.CANCELED,
      lifecycle: {
        action: "cancel",
        reason: "Operational conflict",
        previousStatus: EVENT_STATUS.POSTPONED,
        nextStatus: EVENT_STATUS.CANCELED,
      },
    },
  });

  const postponedResult = await cancelOrganizationEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      reason: "Operational conflict",
    },
    postponedDependencies
  );

  assert.equal(postponedResult.event.status, EVENT_STATUS.CANCELED);
  assert.equal(postponedResult.event.lifecycle.previousStatus, EVENT_STATUS.POSTPONED);
  assert.equal(postponedCalls.createEventStatusHistory.length, 1);
  assert.equal(postponedCalls.createEventStatusHistory[0].previousStatus, EVENT_STATUS.POSTPONED);
  assert.equal(postponedCalls.createEventStatusHistory[0].newStatus, EVENT_STATUS.CANCELED);
  assert.equal(postponedCalls.createEventStatusHistory[0].reason, "Operational conflict");
});

test("event lifecycle completes a published event only after it ends", async () => {
  const { dependencies, calls } = buildDependencies({
    currentEvent: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      startAt: new Date("2026-08-01T09:00:00.000Z"),
      endAt: new Date("2026-08-01T18:00:00.000Z"),
      capacity: 300,
      status: EVENT_STATUS.PUBLISHED,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      lifecycle: {},
    },
    updatedEvent: {
      _id: "event_1",
      status: EVENT_STATUS.COMPLETED,
      lifecycle: {
        action: "complete",
        previousStatus: EVENT_STATUS.PUBLISHED,
        nextStatus: EVENT_STATUS.COMPLETED,
      },
    },
  });

  const result = await completeOrganizationEvent("org_1", "user_1", "event_1", dependencies);

  assert.equal(result.event.status, EVENT_STATUS.COMPLETED);
  assert.equal(result.event.lifecycle.action, "complete");
  assert.equal(result.event.lifecycle.previousStatus, EVENT_STATUS.PUBLISHED);
  assert.equal(calls.createEventStatusHistory.length, 1);
  assert.equal(calls.createEventStatusHistory[0].previousStatus, EVENT_STATUS.PUBLISHED);
  assert.equal(calls.createEventStatusHistory[0].newStatus, EVENT_STATUS.COMPLETED);
});

test("event lifecycle rejects invalid transition requests", async () => {
  const { dependencies, calls } = buildDependencies({
    currentEvent: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      startAt: new Date("2026-09-01T09:00:00.000Z"),
      endAt: new Date("2026-09-01T18:00:00.000Z"),
      capacity: 300,
      status: EVENT_STATUS.PUBLISHED,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      lifecycle: {},
    },
  });

  const publishAgain = await publishOrganizationEvent("org_1", "user_1", "event_1", dependencies);
  assert.equal(publishAgain.error, "Only draft events can be published");

  const resumeFromPublished = await resumeOrganizationEvent("org_1", "user_1", "event_1", dependencies);
  assert.equal(resumeFromPublished.error, "Only postponed events can be resumed");
  assert.equal(calls.createEventStatusHistory.length, 0);

  const canceledDependencies = buildDependencies({
    currentEvent: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      startAt: new Date("2026-09-10T09:00:00.000Z"),
      endAt: new Date("2026-09-10T18:00:00.000Z"),
      capacity: 300,
      status: EVENT_STATUS.CANCELED,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      lifecycle: {},
    },
  });

  const cancelAgain = await cancelOrganizationEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      reason: "Test",
    },
    canceledDependencies.dependencies
  );
  assert.equal(cancelAgain.error, "Only published or postponed events can be canceled");

  const completeCanceled = await completeOrganizationEvent("org_1", "user_1", "event_1", canceledDependencies.dependencies);
  assert.equal(completeCanceled.error, "Only published events can be completed");
});

test("event lifecycle rejects draft postpone and draft cancel without creating history", async () => {
  const { dependencies, calls } = buildDependencies({
    currentEvent: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      startAt: new Date("2026-09-01T09:00:00.000Z"),
      endAt: new Date("2026-09-01T18:00:00.000Z"),
      capacity: 300,
      status: EVENT_STATUS.DRAFT,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      lifecycle: {},
    },
  });

  const cancelDraft = await cancelOrganizationEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      reason: "Test",
    },
    dependencies
  );

  assert.equal(cancelDraft.error, "Only published or postponed events can be canceled");
  assert.equal(calls.createEventStatusHistory.length, 0);

  const postponeDraft = await postponeOrganizationEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      reason: "Test",
      newStartDateTime: new Date("2026-09-10T09:00:00.000Z"),
      newEndDateTime: new Date("2026-09-10T18:00:00.000Z"),
    },
    dependencies
  );

  assert.equal(postponeDraft.error, "Only published events can be postponed");
  assert.equal(calls.createEventStatusHistory.length, 0);
});

test("event lifecycle blocks unauthenticated, manager, and cross-organization access", async () => {
  const unauthenticatedDependencies = buildDependencies({
    authUser: null,
  });

  const unauthenticatedResult = await publishOrganizationEvent(
    "org_1",
    "user_1",
    "event_1",
    unauthenticatedDependencies.dependencies
  );

  assert.equal(unauthenticatedResult.statusCode, 401);

  const managerDependencies = buildDependencies({
    authUser: {
      _id: "user_2",
      role: USER_ROLES.MANAGER,
      organization: "org_1",
    },
  });

  const managerResult = await cancelOrganizationEvent(
    "org_1",
    "user_2",
    "event_1",
    {
      reason: "Test",
    },
    managerDependencies.dependencies
  );

  assert.equal(managerResult.statusCode, 403);

  const crossOrganizationDependencies = buildDependencies({
    authUser: {
      _id: "user_3",
      role: USER_ROLES.ADMIN,
      organization: "org_2",
    },
  });

  const crossOrganizationResult = await publishOrganizationEvent(
    "org_1",
    "user_3",
    "event_1",
    crossOrganizationDependencies.dependencies
  );

  assert.equal(crossOrganizationResult.statusCode, 403);
});

test("event lifecycle returns history in chronological order", async () => {
  const { dependencies, calls } = buildDependencies({
    currentEvent: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      startAt: new Date("2026-09-01T09:00:00.000Z"),
      endAt: new Date("2026-09-01T18:00:00.000Z"),
      capacity: 300,
      status: EVENT_STATUS.COMPLETED,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      lifecycle: {},
    },
    historyRecords: [
      createDocument({
        _id: "history_1",
        event: "event_1",
        previousStatus: EVENT_STATUS.DRAFT,
        newStatus: EVENT_STATUS.PUBLISHED,
        reason: "",
        previousStartAt: null,
        previousEndAt: null,
        newStartAt: null,
        newEndAt: null,
        changedBy: createDocument({ _id: "user_1", firstName: "John", lastName: "Doe", email: "john@example.com" }),
        changedAt: new Date("2026-08-01T10:00:00.000Z"),
      }),
      createDocument({
        _id: "history_2",
        event: "event_1",
        previousStatus: EVENT_STATUS.PUBLISHED,
        newStatus: EVENT_STATUS.POSTPONED,
        reason: "Venue maintenance",
        previousStartAt: new Date("2026-09-01T09:00:00.000Z"),
        previousEndAt: new Date("2026-09-01T18:00:00.000Z"),
        newStartAt: new Date("2026-09-15T09:00:00.000Z"),
        newEndAt: new Date("2026-09-15T18:00:00.000Z"),
        changedBy: createDocument({ _id: "user_1", firstName: "John", lastName: "Doe", email: "john@example.com" }),
        changedAt: new Date("2026-08-02T10:00:00.000Z"),
      }),
    ],
    totalHistoryItems: 2,
  });

  const result = await getOrganizationEventHistory(
    "org_1",
    "user_1",
    "event_1",
    {
      page: "1",
      limit: "20",
    },
    dependencies
  );

  assert.equal(calls.findEventStatusHistories.length, 1);
  assert.equal(calls.countEventStatusHistories.length, 1);
  assert.equal(result.history.length, 2);
  assert.equal(result.history[0]._id, "history_1");
  assert.equal(result.history[1]._id, "history_2");
  assert.equal(result.history[0].changedBy.firstName, "John");
});

test("event lifecycle surfaces history write failures cleanly", async () => {
  const { dependencies } = buildDependencies({
    historyCreateError: new Error("history write failed"),
  });

  const result = await publishOrganizationEvent("org_1", "user_1", "event_1", dependencies);

  assert.equal(result.statusCode, 500);
  assert.equal(result.error, "Something went wrong");
});

test("event lifecycle blocks cross-organization history access", async () => {
  const { dependencies } = buildDependencies({
    authUser: {
      _id: "user_9",
      role: USER_ROLES.ADMIN,
      organization: "org_2",
    },
    currentEvent: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      startAt: new Date("2026-09-01T09:00:00.000Z"),
      endAt: new Date("2026-09-01T18:00:00.000Z"),
      capacity: 300,
      status: EVENT_STATUS.COMPLETED,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      lifecycle: {},
    },
  });

  const result = await getOrganizationEventHistory(
    "org_1",
    "user_9",
    "event_1",
    {},
    dependencies
  );

  assert.equal(result.statusCode, 403);
});

test("event lifecycle rejects invalid postponement payloads", async () => {
  const { dependencies } = buildDependencies({
    currentEvent: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      startAt: new Date("2026-09-01T09:00:00.000Z"),
      endAt: new Date("2026-09-01T18:00:00.000Z"),
      capacity: 300,
      status: EVENT_STATUS.PUBLISHED,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      lifecycle: {},
    },
  });

  const missingReason = await postponeOrganizationEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      reason: "",
      newStartDateTime: new Date("2026-09-10T09:00:00.000Z"),
      newEndDateTime: new Date("2026-09-10T18:00:00.000Z"),
    },
    dependencies
  );

  assert.equal(missingReason.error, "Reason is required");

  const invalidRange = await postponeOrganizationEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      reason: "Venue issue",
      newStartDateTime: new Date("2026-09-10T18:00:00.000Z"),
      newEndDateTime: new Date("2026-09-10T09:00:00.000Z"),
    },
    dependencies
  );

  assert.equal(invalidRange.error, "New end date and time must be after new start date and time");
});
