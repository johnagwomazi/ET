import { EVENT_STATUS } from "../constants/eventStatus.constants.js";

export const PUBLIC_DISCOVERY_STATUSES = [EVENT_STATUS.PUBLISHED, EVENT_STATUS.POSTPONED];

function getDocumentId(document) {
  if (!document) {
    return null;
  }

  if (typeof document === "string") {
    return document;
  }

  if (document._id) {
    return document._id.toString();
  }

  return document.toString();
}

function sanitizeLogo(logo) {
  if (!logo || typeof logo !== "object") {
    return null;
  }

  return {
    url: logo.url || "",
  };
}

export function isPubliclyDiscoverableEvent(event) {
  if (!event) {
    return false;
  }

  return PUBLIC_DISCOVERY_STATUSES.includes(event.status);
}

export function mapPublicOrganizationResponse(organizationDocument) {
  if (!organizationDocument) {
    return null;
  }

  const organization =
    typeof organizationDocument.toObject === "function"
      ? organizationDocument.toObject()
      : organizationDocument;

  return {
    id: getDocumentId(organization),
    organizationName: organization.organizationName || "",
    logo: sanitizeLogo(organization.logo),
    website: organization.website || "",
    socialLinks: organization.socialLinks || {},
  };
}

export function mapPublicVenueResponse(venueDocument) {
  if (!venueDocument) {
    return null;
  }

  const venue = typeof venueDocument.toObject === "function" ? venueDocument.toObject() : venueDocument;

  return {
    name: venue.name || "",
    address: {
      line1: venue.address?.line1 || "",
      line2: venue.address?.line2 || "",
      city: venue.address?.city || "",
      state: venue.address?.state || "",
      country: venue.address?.country || "",
      postalCode: venue.address?.postalCode || "",
    },
  };
}

export function mapPublicEventResponse(eventDocument) {
  if (!eventDocument) {
    return null;
  }

  const event = typeof eventDocument.toObject === "function" ? eventDocument.toObject() : eventDocument;

  return {
    id: getDocumentId(event),
    slug: event.slug || "",
    eventName: event.eventName || "",
    description: event.description || "",
    category: event.category || "",
    banner: {
      url: event.banner?.url || "",
    },
    startAt: event.startAt || null,
    endAt: event.endAt || null,
    capacity: Number.isFinite(Number(event.capacity)) ? Number(event.capacity) : 0,
    status: event.status || EVENT_STATUS.DRAFT,
    isFeatured: Boolean(event.isFeatured),
    featuredAt: event.featuredAt || null,
    lifecycle: {
      reason: event.lifecycle?.reason || null,
    },
    venue: mapPublicVenueResponse(event.venue),
    organization: mapPublicOrganizationResponse(event.organization),
    createdAt: event.createdAt || null,
    updatedAt: event.updatedAt || null,
  };
}
