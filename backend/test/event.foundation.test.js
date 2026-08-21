import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import Event from "../src/models/event.model.js";
import { EVENT_STATUS } from "../src/constants/eventStatus.constants.js";
import {
  eventCreateSchema,
  eventIdParamSchema,
  eventListQuerySchema,
  eventUpdateSchema,
  eventStatusSchema,
} from "../src/validators/event.validator.js";

function buildValidEventData(overrides = {}) {
  return {
    eventName: "Annual Event Summit",
    description: "A foundation event for the event management SaaS.",
    category: "Conference",
    banner: {
      url: "https://example.com/banner.jpg",
      publicId: "banner_123",
    },
    venue: {
      name: "Main Hall",
      address: {
        line1: "12 Event Street",
        city: "Lagos",
        country: "Nigeria",
      },
      notes: "Ground floor entrance",
    },
    startAt: new Date("2026-10-01T09:00:00.000Z"),
    endAt: new Date("2026-10-01T18:00:00.000Z"),
    capacity: 500,
    organization: new mongoose.Types.ObjectId(),
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

test("event model exposes the expected defaults and relationships", async () => {
  const event = new Event(
    buildValidEventData({
      slug: "",
    })
  );

  await event.validate();

  assert.equal(event.status, EVENT_STATUS.DRAFT);
  assert.equal(event.slug, "annual-event-summit");
  assert.equal(eventSchemaPathRef("organization"), "Organization");
  assert.equal(eventSchemaPathRef("createdBy"), "User");
  assert.equal(Event.schema.options.timestamps, true);
});

test("event model rejects invalid capacity and date ranges", async () => {
  const event = new Event({
    eventName: "Annual Event Summit",
    slug: "annual-event-summit",
    organization: new mongoose.Types.ObjectId(),
    createdBy: new mongoose.Types.ObjectId(),
    startAt: new Date("2026-10-01T18:00:00.000Z"),
    endAt: new Date("2026-10-01T09:00:00.000Z"),
    capacity: -1,
  });

  await assert.rejects(event.validate(), (error) => {
    assert.equal(Boolean(error.errors.capacity), true);
    assert.equal(Boolean(error.errors.endAt), true);
    return true;
  });
});

test("event model keeps slug uniqueness scoped to organization", () => {
  const indexes = Event.schema.indexes();
  const scopedSlugIndex = indexes.find(([definition, options]) => {
    return definition.organization === 1 && definition.slug === 1 && options.unique === true;
  });

  assert.ok(scopedSlugIndex);
});

test("event validator accepts a valid create payload", () => {
  const {
    organization,
    createdBy,
    ...eventCreateData
  } = buildValidEventData({
    startAt: "2026-10-01T09:00:00.000Z",
    endAt: "2026-10-01T18:00:00.000Z",
  });

  const result = eventCreateSchema.safeParse({
    ...eventCreateData,
  });

  assert.equal(result.success, true);
});

test("event validator rejects invalid create payloads", () => {
  const result = eventCreateSchema.safeParse({
    eventName: "",
    startAt: "2026-10-01T18:00:00.000Z",
    endAt: "2026-10-01T09:00:00.000Z",
    capacity: -1,
  });

  assert.equal(result.success, false);
});

test("event validator keeps the protected lifecycle status enum available", () => {
  const result = eventStatusSchema.safeParse(EVENT_STATUS.DRAFT);

  assert.equal(result.success, true);
});

test("event validator accepts list query parameters", () => {
  const result = eventListQuerySchema.safeParse({
    page: "2",
    limit: "25",
    sortBy: "startAt",
    sortOrder: "asc",
    search: "summit",
    status: EVENT_STATUS.DRAFT,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.page, 2);
  assert.equal(result.data.limit, 25);
});

test("event validator accepts valid event ids and rejects invalid ones", () => {
  const validResult = eventIdParamSchema.safeParse({
    eventId: "507f1f77bcf86cd799439011",
  });
  const invalidResult = eventIdParamSchema.safeParse({
    eventId: "not-an-id",
  });

  assert.equal(validResult.success, true);
  assert.equal(invalidResult.success, false);
});

test("event validator update schema keeps lifecycle fields out of the structural update payload", () => {
  const result = eventUpdateSchema.safeParse({
    eventName: "Updated Event Name",
    capacity: 750,
  });

  assert.equal(result.success, true);
});

test("event validator update schema rejects lifecycle status updates", () => {
  const result = eventUpdateSchema.safeParse({
    status: EVENT_STATUS.PUBLISHED,
  });

  assert.equal(result.success, false);
});

test("event validator update schema rejects direct schedule changes", () => {
  const result = eventUpdateSchema.safeParse({
    startAt: "2026-10-01T09:00:00.000Z",
    endAt: "2026-10-01T18:00:00.000Z",
  });

  assert.equal(result.success, false);
});

function eventSchemaPathRef(pathName) {
  return Event.schema.path(pathName)?.options?.ref || null;
}
