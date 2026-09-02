import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { EVENT_STATUS } from "../src/constants/eventStatus.constants.js";
import { getPublicEventById, discoverPublicEvents } from "../src/services/eventDiscovery.service.js";

function createDocument(data) {
  return {
    ...data,
    toObject() {
      return { ...data };
    },
  };
}

function buildDiscoveryDependencies(overrides = {}) {
  const calls = {
    findPublicEvents: [],
    countPublicEvents: [],
    findPublicEventById: [],
  };

  const dependencies = {
    eventRepository: {
      findPublicEvents: async (filter, options) => {
        calls.findPublicEvents.push({ filter, options });
        return overrides.events || [];
      },
      countPublicEvents: async (filter) => {
        calls.countPublicEvents.push(filter);
        return overrides.totalItems ?? 0;
      },
      findPublicEventById: async (eventId) => {
        calls.findPublicEventById.push(eventId);
        return overrides.publicEvent === undefined ? null : overrides.publicEvent;
      },
    },
  };

  return { dependencies, calls };
}

test("public discovery still returns featured and trending event collections", async () => {
  const { dependencies, calls } = buildDiscoveryDependencies({
    events: [
      createDocument({
        _id: "event_1",
        eventName: "Annual Event Summit",
        slug: "annual-event-summit",
        description: "A public summit.",
        category: "Conference",
        banner: { url: "https://example.com/banner.jpg" },
        startAt: new Date("2026-10-01T09:00:00.000Z"),
        endAt: new Date("2026-10-01T18:00:00.000Z"),
        capacity: 500,
        status: EVENT_STATUS.PUBLISHED,
        isFeatured: true,
        featuredAt: new Date("2026-09-01T09:00:00.000Z"),
        lifecycle: { reason: "Rescheduled due to venue maintenance" },
        venue: { name: "Main Hall", address: { city: "Lagos" } },
        organization: createDocument({
          _id: "org_1",
          organizationName: "Events Org",
          logo: { url: "https://example.com/logo.png" },
          website: "https://events.example.com",
          socialLinks: { website: "https://events.example.com" },
        }),
        createdAt: new Date("2026-08-01T09:00:00.000Z"),
        updatedAt: new Date("2026-08-02T09:00:00.000Z"),
      }),
    ],
    totalItems: 1,
  });

  const result = await discoverPublicEvents({ page: "1", limit: "12" }, dependencies);

  assert.equal(result.events.length, 1);
  assert.equal(result.featuredEvents.length, 1);
  assert.equal(result.trendingEvents.length, 1);
  assert.equal(calls.findPublicEvents.length >= 2, true);
  assert.equal(calls.countPublicEvents.length, 1);

  const sanitizedFilter = calls.findPublicEvents[0].filter;
  mongoose.sanitizeFilter(sanitizedFilter);
  assert.deepEqual(sanitizedFilter.status.$in, [EVENT_STATUS.PUBLISHED, EVENT_STATUS.POSTPONED]);
});

test("public event details returns a published event with public fields only", async () => {
  const publicEvent = createDocument({
    _id: "event_1",
    eventName: "Annual Event Summit",
    slug: "annual-event-summit",
    description: "A public summit.",
    category: "Conference",
    banner: { url: "https://example.com/banner.jpg" },
    startAt: new Date("2026-10-01T09:00:00.000Z"),
    endAt: new Date("2026-10-01T18:00:00.000Z"),
    capacity: 500,
    status: EVENT_STATUS.PUBLISHED,
    isFeatured: true,
    featuredAt: new Date("2026-09-01T09:00:00.000Z"),
    lifecycle: { reason: "Weather delay" },
    venue: { name: "Main Hall", address: { city: "Lagos", country: "Nigeria" } },
    organization: createDocument({
      _id: "org_1",
      organizationName: "Events Org",
      logo: { url: "https://example.com/logo.png" },
      website: "https://events.example.com",
      socialLinks: { website: "https://events.example.com" },
      internalNotes: "hidden",
    }),
    createdAt: new Date("2026-08-01T09:00:00.000Z"),
    updatedAt: new Date("2026-08-02T09:00:00.000Z"),
    createdBy: createDocument({ _id: "user_1", email: "hidden@example.com" }),
    featuredBy: createDocument({ _id: "user_2", email: "hidden2@example.com" }),
  });

  const { dependencies, calls } = buildDiscoveryDependencies({
    publicEvent,
  });

  const result = await getPublicEventById("event_1", dependencies);

  assert.equal(result.error, undefined);
  assert.equal(result.event.id, "event_1");
  assert.equal(result.event.eventName, "Annual Event Summit");
  assert.equal(result.event.status, EVENT_STATUS.PUBLISHED);
  assert.equal(result.event.organization.organizationName, "Events Org");
  assert.equal(result.event.lifecycle.reason, "Weather delay");
  assert.equal(Object.hasOwn(result.event, "createdBy"), false);
  assert.equal(Object.hasOwn(result.event, "featuredBy"), false);
  assert.equal(calls.findPublicEventById.length, 1);
});

test("public event details hides draft events", async () => {
  const { dependencies } = buildDiscoveryDependencies({
    publicEvent: createDocument({
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      status: EVENT_STATUS.DRAFT,
      lifecycle: {},
      organization: createDocument({ _id: "org_1", organizationName: "Events Org" }),
    }),
  });

  const result = await getPublicEventById("event_1", dependencies);

  assert.equal(result.error, "Event not found");
  assert.equal(result.statusCode, 404);
});

test("public event details hides canceled and completed events", async () => {
  for (const status of [EVENT_STATUS.CANCELED, EVENT_STATUS.COMPLETED]) {
    const { dependencies } = buildDiscoveryDependencies({
      publicEvent: createDocument({
        _id: "event_1",
        eventName: "Annual Event Summit",
        slug: "annual-event-summit",
        status,
        lifecycle: {},
        organization: createDocument({ _id: "org_1", organizationName: "Events Org" }),
      }),
    });

    const result = await getPublicEventById("event_1", dependencies);

    assert.equal(result.error, "Event not found");
    assert.equal(result.statusCode, 404);
  }
});

test("public event details keeps postponed events publicly accessible", async () => {
  const { dependencies } = buildDiscoveryDependencies({
    publicEvent: createDocument({
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      description: "A public summit.",
      category: "Conference",
      banner: { url: "https://example.com/banner.jpg" },
      startAt: new Date("2026-10-15T09:00:00.000Z"),
      endAt: new Date("2026-10-15T18:00:00.000Z"),
      capacity: 500,
      status: EVENT_STATUS.POSTPONED,
      lifecycle: { reason: "Venue maintenance" },
      organization: createDocument({
        _id: "org_1",
        organizationName: "Events Org",
        logo: { url: "https://example.com/logo.png" },
        website: "https://events.example.com",
        socialLinks: { website: "https://events.example.com" },
      }),
      createdAt: new Date("2026-08-01T09:00:00.000Z"),
      updatedAt: new Date("2026-08-02T09:00:00.000Z"),
    }),
  });

  const result = await getPublicEventById("event_1", dependencies);

  assert.equal(result.error, undefined);
  assert.equal(result.event.status, EVENT_STATUS.POSTPONED);
  assert.equal(result.event.lifecycle.reason, "Venue maintenance");
});

test("public event details returns not found for missing events", async () => {
  const { dependencies } = buildDiscoveryDependencies({
    publicEvent: null,
  });

  const result = await getPublicEventById("missing_event", dependencies);

  assert.equal(result.error, "Event not found");
  assert.equal(result.statusCode, 404);
});
