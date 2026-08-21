import test from "node:test";
import assert from "node:assert/strict";

import { EVENT_STATUS } from "../src/constants/eventStatus.constants.js";
import { USER_ROLES } from "../src/constants/roles.constants.js";
import {
  createOrganizationEvent,
  deleteOrganizationEvent,
  getOrganizationEvents,
  updateOrganizationEvent,
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
    findEvents: [],
    countEvents: [],
    findEventByIdAndOrganization: [],
    findEventByOrganizationAndSlug: [],
    createEvent: [],
    updateEventByIdAndOrganization: [],
    deleteEventByIdAndOrganization: [],
  };

  const dependencies = {
    authRepository: {
      findAuthUserById: async (userId) => {
        calls.findAuthUserById.push(userId);
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
      findEvents: async (filter, options) => {
        calls.findEvents.push({ filter, options });
        return overrides.events || [];
      },
      countEvents: async (filter) => {
        calls.countEvents.push(filter);
        return overrides.totalItems ?? 0;
      },
      findEventByIdAndOrganization: async (eventId, organizationId) => {
        calls.findEventByIdAndOrganization.push({ eventId, organizationId });
        return overrides.eventById === undefined
          ? null
          : overrides.eventById;
      },
      findEventByOrganizationAndSlug: async (organizationId, slug, eventId) => {
        calls.findEventByOrganizationAndSlug.push({ organizationId, slug, eventId });
        return overrides.eventBySlug === undefined
          ? null
          : overrides.eventBySlug;
      },
      createEvent: async (eventData) => {
        calls.createEvent.push(eventData);
        return overrides.createdEvent || createDocument({
          _id: "event_1",
          ...eventData,
        });
      },
      updateEventByIdAndOrganization: async (eventId, organizationId, updateData) => {
        calls.updateEventByIdAndOrganization.push({ eventId, organizationId, updateData });
        return overrides.updatedEvent || createDocument({
          _id: eventId,
          organization: organizationId,
          ...updateData,
        });
      },
      deleteEventByIdAndOrganization: async (eventId, organizationId) => {
        calls.deleteEventByIdAndOrganization.push({ eventId, organizationId });
        return overrides.deletedEvent || createDocument({
          _id: eventId,
          organization: organizationId,
          status: EVENT_STATUS.DRAFT,
        });
      },
    },
  };

  return { dependencies, calls };
}

test("event service creates draft events for organization admins", async () => {
  const { dependencies, calls } = buildDependencies({
    eventBySlug: null,
    createdEvent: createDocument({
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      status: EVENT_STATUS.DRAFT,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
    }),
    eventById: createDocument({
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      status: EVENT_STATUS.DRAFT,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
    }),
  });

  const result = await createOrganizationEvent(
    "org_1",
    "user_1",
    {
      eventName: "Annual Event Summit",
      description: "An event for the platform",
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      endAt: new Date("2026-10-01T18:00:00.000Z"),
      capacity: 300,
    },
    dependencies
  );

  assert.equal(result.error, undefined);
  assert.equal(result.event.slug, "annual-event-summit");
  assert.equal(result.event.status, EVENT_STATUS.DRAFT);
  assert.equal(calls.findEventByOrganizationAndSlug.length, 1);
  assert.equal(calls.createEvent.length, 1);
  assert.equal(calls.createEvent[0].organization, "org_1");
  assert.equal(calls.createEvent[0].createdBy, "user_1");
});

test("event service blocks managers from CRUD access", async () => {
  const { dependencies, calls } = buildDependencies({
    authUser: {
      _id: "user_2",
      role: USER_ROLES.MANAGER,
      organization: "org_1",
    },
  });

  const result = await getOrganizationEvents("org_1", "user_2", {}, dependencies);

  assert.equal(result.error, "You do not have access to this resource");
  assert.equal(result.statusCode, 403);
  assert.equal(calls.findEvents.length, 0);
});

test("event service returns paginated organization events", async () => {
  const { dependencies, calls } = buildDependencies({
    events: [
      createDocument({
        _id: "event_1",
        eventName: "Annual Event Summit",
        slug: "annual-event-summit",
        status: EVENT_STATUS.DRAFT,
        organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
        createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      }),
    ],
    totalItems: 1,
  });

  const result = await getOrganizationEvents(
    "org_1",
    "user_1",
    {
      page: "2",
      limit: "5",
      search: "summit",
      status: EVENT_STATUS.DRAFT,
      sortBy: "startAt",
      sortOrder: "asc",
    },
    dependencies
  );

  assert.equal(result.events.length, 1);
  assert.equal(result.pagination.page, 2);
  assert.equal(result.pagination.limit, 5);
  assert.equal(calls.findEvents.length, 1);
  assert.equal(calls.countEvents.length, 1);
  assert.equal(calls.findEvents[0].filter.organization, "org_1");
  assert.equal(calls.findEvents[0].filter.status, EVENT_STATUS.DRAFT);
  assert.equal(calls.findEvents[0].options.sortBy, "startAt");
  assert.equal(calls.findEvents[0].options.sortOrder, 1);
});

test("event service updates event slugs when the name changes", async () => {
  const { dependencies, calls } = buildDependencies({
    eventById: createDocument({
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      status: EVENT_STATUS.DRAFT,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
    }),
    eventBySlug: null,
    updatedEvent: createDocument({
      _id: "event_1",
      eventName: "Annual Product Summit",
      slug: "annual-product-summit",
      status: EVENT_STATUS.DRAFT,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
    }),
  });

  const result = await updateOrganizationEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      eventName: "Annual Product Summit",
    },
    dependencies
  );

  assert.equal(result.event.slug, "annual-product-summit");
  assert.equal(calls.findEventByOrganizationAndSlug.length, 1);
  assert.equal(calls.updateEventByIdAndOrganization.length, 1);
  assert.equal(calls.updateEventByIdAndOrganization[0].updateData.slug, "annual-product-summit");
});

test("event service blocks deleting non-draft events", async () => {
  const { dependencies } = buildDependencies({
    eventById: createDocument({
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      status: EVENT_STATUS.PUBLISHED,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
    }),
  });

  const result = await deleteOrganizationEvent("org_1", "user_1", "event_1", dependencies);

  assert.equal(result.error, "Only draft events can be deleted");
  assert.equal(result.statusCode, 400);
});
