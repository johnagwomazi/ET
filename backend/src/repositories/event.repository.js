import mongoose from "mongoose";
import Event from "../models/event.model.js";
import { PUBLIC_DISCOVERY_STATUSES } from "../utils/eventDiscovery.util.js";

const PUBLIC_EVENT_POPULATE = {
  path: "organization",
  select: "organizationName logo website socialLinks",
};

const PUBLIC_EVENT_SELECT =
  "eventName slug description category banner startAt endAt capacity status isFeatured featuredAt lifecycle venue organization createdAt updatedAt";

function buildEventQuery(query) {
  return Event.find(query)
    .populate("organization")
    .populate("createdBy");
}

function buildPublicEventQuery(query) {
  return Event.find(query)
    .select(PUBLIC_EVENT_SELECT)
    .populate(PUBLIC_EVENT_POPULATE);
}

function applySession(query, options = {}) {
  if (options.session) {
    return query.session(options.session);
  }

  return query;
}

export async function createEvent(eventData, options = {}) {
  const event = new Event(eventData);
  return event.save({ session: options.session });
}

export async function countEvents(filter = {}) {
  return Event.countDocuments(filter);
}

export async function findEvents(filter = {}, options = {}) {
  return applySession(
    buildEventQuery(filter)
      .sort({ [options.sortBy || "createdAt"]: options.sortOrder || -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 10),
    options
  );
}

export async function findEventByIdAndOrganization(eventId, organizationId, options = {}) {
  return applySession(
    Event.findOne({
      _id: eventId,
      organization: organizationId,
    })
      .populate("organization")
      .populate("createdBy"),
    options
  );
}

export async function findEventByIdAndOrganizationAndStatus(eventId, organizationId, status, options = {}) {
  return applySession(
    Event.findOne({
      _id: eventId,
      organization: organizationId,
      status,
    })
      .populate("organization")
      .populate("createdBy"),
    options
  );
}

export async function findEventByOrganizationAndSlug(organizationId, slug, eventId = null) {
  const filter = {
    organization: organizationId,
    slug,
  };

  if (eventId) {
    filter._id = mongoose.trusted({ $ne: eventId });
  }

  return Event.findOne(filter);
}

export async function updateEventByIdAndOrganization(eventId, organizationId, updateData, options = {}) {
  return applySession(
    Event.findOneAndUpdate(
      {
        _id: eventId,
        organization: organizationId,
      },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("organization")
      .populate("createdBy"),
    options
  );
}

export async function updateEventByIdAndOrganizationAndStatus(eventId, organizationId, status, updateData, options = {}) {
  return applySession(
    Event.findOneAndUpdate(
      {
        _id: eventId,
        organization: organizationId,
        status,
      },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("organization")
      .populate("createdBy"),
    options
  );
}

export async function deleteEventByIdAndOrganization(eventId, organizationId, options = {}) {
  return applySession(
    Event.findOneAndDelete({
      _id: eventId,
      organization: organizationId,
    })
      .populate("organization")
      .populate("createdBy"),
    options
  );
}

export async function countPublicEvents(filter = {}) {
  return Event.countDocuments(filter);
}

export async function findPublicEvents(filter = {}, options = {}) {
  return applySession(
    buildPublicEventQuery(filter)
      .sort(options.sort || { startAt: 1, createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 10),
    options
  );
}

export async function findPublicEventById(eventId, options = {}) {
  return applySession(
    Event.findOne({
      _id: eventId,
      status: mongoose.trusted({
        $in: PUBLIC_DISCOVERY_STATUSES,
      }),
    })
      .select(PUBLIC_EVENT_SELECT)
      .populate(PUBLIC_EVENT_POPULATE),
    options
  );
}

export async function findEventsStartingBetween(startAt, endAt, statuses = []) {
  const filter = {
    startAt: mongoose.trusted({ $gte: startAt, $lt: endAt }),
  };

  if (statuses.length) {
    filter.status = mongoose.trusted({ $in: statuses });
  }

  return Event.find(filter).populate("organization").sort({ startAt: 1 });
}
