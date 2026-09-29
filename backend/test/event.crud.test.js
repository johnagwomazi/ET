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
import { updateEventTicketType } from "../src/services/ticketing.service.js";

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
    ticketTypeRepository: {
      async getTicketInventoryTotals() {
        return overrides.ticketInventoryTotals || { allocatedQuantity: 0, issuedQuantity: 0 };
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

test("event service preserves a stable event slug when the name changes", async () => {
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
      slug: "annual-event-summit",
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

  assert.equal(result.event.slug, "annual-event-summit");
  assert.equal(calls.findEventByOrganizationAndSlug.length, 0);
  assert.equal(calls.updateEventByIdAndOrganization.length, 1);
  assert.equal(calls.updateEventByIdAndOrganization[0].updateData.slug, undefined);
});

test("published event capacity can increase but cannot drop below issued tickets or ticket allocations", async () => {
  const publishedEvent = createDocument({
    _id: "event_1",
    eventName: "Annual Event Summit",
    slug: "annual-event-summit",
    status: EVENT_STATUS.PUBLISHED,
    capacity: 100,
    allocatedTicketQuantity: 30,
    organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
    createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
  });
  const { dependencies, calls } = buildDependencies({
    eventById: publishedEvent,
    ticketInventoryTotals: { allocatedQuantity: 80, issuedQuantity: 30 },
    updatedEvent: createDocument({ ...publishedEvent.toObject(), capacity: 150 }),
  });

  const increased = await updateOrganizationEvent("org_1", "user_1", "event_1", { capacity: 150 }, dependencies);
  assert.equal(increased.error, undefined);
  assert.equal(calls.updateEventByIdAndOrganization[0].updateData.capacity, 150);

  const belowIssued = await updateOrganizationEvent("org_1", "user_1", "event_1", { capacity: 20 }, dependencies);
  assert.match(belowIssued.error, /tickets already issued/i);

  const belowAllocation = await updateOrganizationEvent("org_1", "user_1", "event_1", { capacity: 70 }, dependencies);
  assert.match(belowAllocation.error, /total ticket allocation/i);
  assert.equal(calls.updateEventByIdAndOrganization.length, 1);
});

test("a persisted capacity increase is used by the next allocation update", async () => {
  const organization = { _id: "org_1", status: "ACTIVE", isDeleted: false, primaryAdmin: "user_1" };
  const actor = { _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" };
  let event = {
    _id: "event_1",
    eventName: "Capacity Test",
    slug: "capacity-test",
    status: EVENT_STATUS.PUBLISHED,
    capacity: 100,
    allocatedTicketQuantity: 20,
    organization,
    createdBy: actor,
  };
  const regular = {
    _id: "ticket_regular",
    event: "event_1",
    organization: "org_1",
    name: "Regular",
    price: 1000,
    currency: "NGN",
    quantity: 70,
    soldQuantity: 20,
    status: "ACTIVE",
  };
  const vip = { ...regular, _id: "ticket_vip", name: "VIP", quantity: 30, soldQuantity: 0 };
  const ticketTypes = [regular, vip];
  const dependencies = {
    mongoose: { connection: { readyState: 0 } },
    authRepository: {
      async findAuthUserById() {
        return actor;
      },
    },
    organizationRepository: {
      async findOrganizationDetailsById() {
        return organization;
      },
    },
    eventRepository: {
      async countEvents() {
        return 1;
      },
      async findEventByIdAndOrganization() {
        return event;
      },
      async findEventByOrganizationAndSlug() {
        return null;
      },
      async updateEventByIdAndOrganization(eventId, organizationId, updateData) {
        event = { ...event, ...updateData };
        return event;
      },
    },
    ticketTypeRepository: {
      async getTicketInventoryTotals() {
        return {
          allocatedQuantity: ticketTypes.reduce((sum, type) => sum + type.quantity, 0),
          issuedQuantity: ticketTypes.reduce((sum, type) => sum + type.soldQuantity, 0),
        };
      },
      async findTicketTypeByIdAndEvent(ticketTypeId) {
        return ticketTypes.find((type) => type._id === ticketTypeId) || null;
      },
      async updateTicketTypeByIdAndEvent(ticketTypeId, eventId, organizationId, updateData) {
        const ticketType = ticketTypes.find((type) => type._id === ticketTypeId);
        Object.assign(ticketType, updateData);
        return ticketType;
      },
    },
  };

  const capacityResult = await updateOrganizationEvent("org_1", "user_1", "event_1", { capacity: 150 }, dependencies);
  assert.equal(capacityResult.error, undefined);
  assert.equal(event.capacity, 150);

  const allocationResult = await updateEventTicketType(
    "org_1",
    "user_1",
    "event_1",
    "ticket_regular",
    { quantity: 100 },
    dependencies
  );
  assert.equal(allocationResult.error, undefined);
  assert.equal(regular.quantity + vip.quantity, 130);
  assert.equal(event.capacity, 150);
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

test("automatic event slugs use a globally unique numeric suffix", async () => {
  const { dependencies } = buildDependencies();
  dependencies.eventRepository.findEventBySlugOrAlias = async (slug) => (
    slug === "annual-event-summit" ? { _id: "another_event" } : null
  );

  const result = await createOrganizationEvent(
    "org_1",
    "user_1",
    {
      eventName: "Annual Event Summit",
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      endAt: new Date("2026-10-01T18:00:00.000Z"),
      capacity: 300,
    },
    dependencies
  );

  assert.equal(result.error, undefined);
  assert.equal(result.event.slug, "annual-event-summit-2");
});

test("automatic event slugs advance through first, second, and third candidates", async () => {
  const { dependencies } = buildDependencies();
  const claimedSlugs = new Set();

  dependencies.eventRepository.findEventBySlugOrAlias = async (slug) => (
    claimedSlugs.has(slug) ? { _id: `event-${slug}` } : null
  );
  dependencies.eventRepository.createEvent = async (eventData) => {
    claimedSlugs.add(eventData.slug);
    return createDocument({ _id: `event-${claimedSlugs.size}`, ...eventData });
  };

  const payload = {
    eventName: "Annual Event Summit",
    startAt: new Date("2026-10-01T09:00:00.000Z"),
    endAt: new Date("2026-10-01T18:00:00.000Z"),
    capacity: 300,
  };
  const first = await createOrganizationEvent("org_1", "user_1", payload, dependencies);
  const second = await createOrganizationEvent("org_1", "user_1", payload, dependencies);
  const third = await createOrganizationEvent("org_1", "user_1", payload, dependencies);

  assert.equal(first.event.slug, "annual-event-summit");
  assert.equal(second.event.slug, "annual-event-summit-2");
  assert.equal(third.event.slug, "annual-event-summit-3");
});

test("slug duplicate retries advance candidates without waiting for query visibility", async () => {
  const { dependencies } = buildDependencies();
  const attemptedSlugs = [];
  dependencies.eventRepository.findEventBySlugOrAlias = async () => null;
  dependencies.eventRepository.createEvent = async (eventData) => {
    attemptedSlugs.push(eventData.slug);
    if (attemptedSlugs.length < 3) {
      const error = new Error("duplicate key error index: slug_1");
      error.code = 11000;
      error.keyPattern = { slug: 1 };
      throw error;
    }
    return createDocument({ _id: "event_3", ...eventData });
  };

  const result = await createOrganizationEvent(
    "org_1",
    "user_1",
    {
      eventName: "Annual Event Summit",
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      endAt: new Date("2026-10-01T18:00:00.000Z"),
      capacity: 300,
    },
    dependencies
  );

  assert.equal(result.event.slug, "annual-event-summit-3");
  assert.deepEqual(attemptedSlugs, [
    "annual-event-summit",
    "annual-event-summit-2",
    "annual-event-summit-3",
  ]);
});

test("unrelated duplicate keys fail immediately instead of exhausting slug retries", async () => {
  const { dependencies } = buildDependencies();
  let createAttempts = 0;
  dependencies.eventRepository.findEventBySlugOrAlias = async () => null;
  dependencies.eventRepository.createEvent = async () => {
    createAttempts += 1;
    const error = new Error("duplicate key error index: unrelated_reference_1");
    error.code = 11000;
    error.keyPattern = { unrelatedReference: 1 };
    throw error;
  };

  await assert.rejects(
    createOrganizationEvent(
      "org_1",
      "user_1",
      {
        eventName: "Annual Event Summit",
        startAt: new Date("2026-10-01T09:00:00.000Z"),
        endAt: new Date("2026-10-01T18:00:00.000Z"),
        capacity: 300,
      },
      dependencies
    ),
    /unrelated_reference_1/
  );
  assert.equal(createAttempts, 1);
});

test("custom event slug changes retain the previous slug as a redirect alias", async () => {
  const currentEvent = createDocument({
    _id: "event_1",
    eventName: "Annual Event Summit",
    slug: "annual-event-summit",
    slugAliases: ["summit-legacy"],
    status: EVENT_STATUS.DRAFT,
    startAt: new Date("2026-10-01T09:00:00.000Z"),
    endAt: new Date("2026-10-01T18:00:00.000Z"),
    organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
    createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
  });
  const { dependencies, calls } = buildDependencies({
    eventById: currentEvent,
    eventBySlug: null,
  });

  const result = await updateOrganizationEvent(
    "org_1",
    "user_1",
    "event_1",
    { slug: "Annual Product Summit" },
    dependencies
  );

  assert.equal(result.error, undefined);
  assert.equal(calls.updateEventByIdAndOrganization[0].updateData.slug, "annual-product-summit");
  assert.deepEqual(
    calls.updateEventByIdAndOrganization[0].updateData.slugAliases,
    ["summit-legacy", "annual-event-summit"]
  );
});

test("custom event slugs reject reserved and already-claimed URLs", async () => {
  const reserved = buildDependencies();
  const reservedResult = await createOrganizationEvent(
    "org_1",
    "user_1",
    {
      eventName: "Discover",
      slug: "discover",
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      endAt: new Date("2026-10-01T18:00:00.000Z"),
      capacity: 50,
    },
    reserved.dependencies
  );
  assert.equal(reservedResult.statusCode, 400);

  const claimed = buildDependencies();
  claimed.dependencies.eventRepository.findEventBySlugOrAlias = async () => ({ _id: "another_event" });
  const claimedResult = await createOrganizationEvent(
    "org_1",
    "user_1",
    {
      eventName: "Different Name",
      slug: "annual-event-summit",
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      endAt: new Date("2026-10-01T18:00:00.000Z"),
      capacity: 50,
    },
    claimed.dependencies
  );
  assert.equal(claimedResult.statusCode, 409);
});

test("draft schedules can be edited normally without lifecycle transitions", async () => {
  const currentEvent = createDocument({
    _id: "event_1",
    eventName: "Draft Summit",
    slug: "draft-summit",
    status: EVENT_STATUS.DRAFT,
    startAt: new Date("2026-10-01T09:00:00.000Z"),
    endAt: new Date("2026-10-01T18:00:00.000Z"),
    organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
    createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
  });
  const { dependencies, calls } = buildDependencies({ eventById: currentEvent });
  const nextStartAt = new Date("2026-11-01T09:00:00.000Z");
  const nextEndAt = new Date("2026-11-01T18:00:00.000Z");

  const result = await updateOrganizationEvent(
    "org_1",
    "user_1",
    "event_1",
    { startAt: nextStartAt, endAt: nextEndAt },
    dependencies
  );

  assert.equal(result.error, undefined);
  assert.equal(calls.updateEventByIdAndOrganization.length, 1);
  assert.equal(calls.updateEventByIdAndOrganization[0].updateData.startAt, nextStartAt);
  assert.equal(calls.updateEventByIdAndOrganization[0].updateData.endAt, nextEndAt);
});

test("published schedules still require the existing lifecycle flow", async () => {
  const { dependencies, calls } = buildDependencies({
    eventById: createDocument({
      _id: "event_1",
      eventName: "Published Summit",
      slug: "published-summit",
      status: EVENT_STATUS.PUBLISHED,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      endAt: new Date("2026-10-01T18:00:00.000Z"),
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
    }),
  });

  const result = await updateOrganizationEvent(
    "org_1",
    "user_1",
    "event_1",
    { startAt: new Date("2026-11-01T09:00:00.000Z") },
    dependencies
  );

  assert.match(result.error, /lifecycle operations/i);
  assert.equal(calls.updateEventByIdAndOrganization.length, 0);
});
