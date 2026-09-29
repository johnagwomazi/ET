import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import Event from "../src/models/event.model.js";
import { EVENT_STATUS } from "../src/constants/eventStatus.constants.js";
import {
  eventCreateSchema,
  eventIdParamSchema,
  eventListQuerySchema,
  publicEventIdentifierParamSchema,
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

test("event model keeps current slugs and historical aliases globally unique", () => {
  const indexes = Event.schema.indexes();
  const slugIndex = indexes.find(([definition, options]) => {
    return definition.slug === 1 && options.unique === true;
  });
  const aliasIndex = indexes.find(([definition, options]) => {
    return definition.slugAliases === 1 && options.unique === true && options.sparse === true;
  });

  assert.ok(slugIndex);
  assert.ok(aliasIndex);
});

test("event model omits empty slug aliases and preserves populated history", () => {
  const baseData = {
    eventName: "Annual Event Summit",
    slug: "annual-event-summit",
    organization: new mongoose.Types.ObjectId(),
    createdBy: new mongoose.Types.ObjectId(),
    startAt: new Date("2026-10-01T09:00:00.000Z"),
    endAt: new Date("2026-10-01T18:00:00.000Z"),
    capacity: 300,
  };
  const withoutHistory = new Event(baseData);
  const withHistory = new Event({ ...baseData, slugAliases: ["annual-summit"] });

  assert.equal(withoutHistory.slugAliases, undefined);
  assert.equal(Object.hasOwn(withoutHistory.toObject(), "slugAliases"), false);
  assert.deepEqual([...withHistory.slugAliases], ["annual-summit"]);
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

test("public event identifier validator accepts both ids and clean slugs", () => {
  assert.equal(publicEventIdentifierParamSchema.safeParse({ eventId: "507f1f77bcf86cd799439011" }).success, true);
  assert.equal(publicEventIdentifierParamSchema.safeParse({ eventId: "annual-event-summit" }).success, true);
  assert.equal(publicEventIdentifierParamSchema.safeParse({ eventId: "../admin" }).success, false);
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

test("event validator update schema accepts draft schedule changes for service-level lifecycle checks", () => {
  const result = eventUpdateSchema.safeParse({
    startAt: "2026-10-01T09:00:00.000Z",
    endAt: "2026-10-01T18:00:00.000Z",
  });

  assert.equal(result.success, true);
});

function eventSchemaPathRef(pathName) {
  return Event.schema.path(pathName)?.options?.ref || null;
}
