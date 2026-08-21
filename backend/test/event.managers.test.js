import test from "node:test";
import assert from "node:assert/strict";

import { EVENT_STATUS } from "../src/constants/eventStatus.constants.js";
import { USER_ROLES } from "../src/constants/roles.constants.js";
import {
  assignManagerToEvent,
  getEventManagers,
  getManagerAssignedEventById,
  getManagerAssignedEvents,
  removeManagerFromEvent,
} from "../src/services/eventManager.service.js";
import {
  eventManagerAssignSchema,
  eventManagerIdParamSchema,
  eventManagerListQuerySchema,
} from "../src/validators/event.validator.js";

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
    findOrganizationMemberByIdAndOrganization: [],
    findActiveEventManagerAssignment: [],
    findManagerAssignmentByEventAndUser: [],
    findEventManagers: [],
    countEventManagers: [],
    findManagerAssignments: [],
    createEventManagerAssignment: [],
    deactivateEventManagerAssignment: [],
  };

  let activeAssignment = overrides.activeAssignment ?? null;

  const defaultEvent = createDocument({
    _id: "event_1",
    eventName: "Annual Event Summit",
    slug: "annual-event-summit",
    status: EVENT_STATUS.DRAFT,
    organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
    createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
  });

  const defaultManager = createDocument({
    _id: "user_2",
    firstName: "Mia",
    lastName: "Manager",
    email: "mia@example.com",
    role: USER_ROLES.MANAGER,
    organization: "org_1",
  });

  const defaultAssignment = createDocument({
    _id: "assignment_1",
    event: defaultEvent,
    user: defaultManager,
    assignedBy: createDocument({ _id: "user_1", firstName: "Ada", lastName: "Admin", role: USER_ROLES.ADMIN }),
    assignedAt: new Date("2026-08-01T10:00:00.000Z"),
  });

  const dependencies = {
    authRepository: {
      findAuthUserById: async (userId) => {
        calls.findAuthUserById.push(userId);
        return createDocument(
          overrides.authUser || {
            _id: "user_1",
            role: USER_ROLES.ADMIN,
            organization: "org_1",
          }
        );
      },
    },
    organizationRepository: {
      findOrganizationDetailsById: async (organizationId) => {
        calls.findOrganizationDetailsById.push(organizationId);

        if (overrides.organization === null) {
          return null;
        }

        return createDocument(
          overrides.organization || {
            _id: "org_1",
            status: "APPROVED",
            isDeleted: false,
            primaryAdmin: "user_1",
          }
        );
      },
    },
    eventRepository: {
      findEventByIdAndOrganization: async (eventId, organizationId) => {
        calls.findEventByIdAndOrganization.push({ eventId, organizationId });

        if (overrides.eventById === null) {
          return null;
        }

        if (overrides.eventById !== undefined) {
          return createDocument(overrides.eventById);
        }

        return createDocument({
          ...defaultEvent,
          _id: eventId,
          organization: createDocument({ _id: organizationId, status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
        });
      },
    },
    userRepository: {
      findOrganizationMemberByIdAndOrganization: async (userId, organizationId) => {
        calls.findOrganizationMemberByIdAndOrganization.push({ userId, organizationId });

        if (overrides.targetUser === null) {
          return null;
        }

        if (overrides.targetUser !== undefined) {
          return createDocument(overrides.targetUser);
        }

        return createDocument({
          ...defaultManager,
          _id: userId,
          organization: organizationId,
        });
      },
    },
    eventManagerAssignmentRepository: {
      findActiveEventManagerAssignment: async (eventId, userId) => {
        calls.findActiveEventManagerAssignment.push({ eventId, userId });

        if (overrides.activeAssignment === null || !activeAssignment || activeAssignment.removedAt) {
          return null;
        }

        if (
          activeAssignment.event?._id?.toString?.() !== eventId &&
          activeAssignment.event?._id !== eventId
        ) {
          return null;
        }

        if (
          activeAssignment.user?._id?.toString?.() !== userId &&
          activeAssignment.user?._id !== userId
        ) {
          return null;
        }

        return createDocument(activeAssignment);
      },
      findManagerAssignmentByEventAndUser: async (eventId, userId) => {
        calls.findManagerAssignmentByEventAndUser.push({ eventId, userId });

        if (!activeAssignment) {
          return null;
        }

        return createDocument(activeAssignment);
      },
      findEventManagers: async (eventId, options) => {
        calls.findEventManagers.push({ eventId, options });
        return (overrides.eventManagers || [defaultAssignment]).map((assignment) => createDocument(assignment));
      },
      countEventManagers: async (eventId) => {
        calls.countEventManagers.push(eventId);
        return overrides.eventManagers?.length ?? 1;
      },
      findManagerAssignments: async (userId, options) => {
        calls.findManagerAssignments.push({ userId, options });

        if (overrides.managerAssignments === null) {
          return [];
        }

        return (overrides.managerAssignments || [
          defaultAssignment,
          createDocument({
            _id: "assignment_2",
            event: createDocument({
              _id: "event_2",
              eventName: "Second Event",
              slug: "second-event",
              status: EVENT_STATUS.PUBLISHED,
              organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
              createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
            }),
            user: defaultManager,
            assignedBy: createDocument({ _id: "user_1", firstName: "Ada", lastName: "Admin", role: USER_ROLES.ADMIN }),
            assignedAt: new Date("2026-08-02T10:00:00.000Z"),
          }),
          createDocument({
            _id: "assignment_3",
            event: createDocument({
              _id: "event_3",
              eventName: "Third Event",
              slug: "third-event",
              status: EVENT_STATUS.COMPLETED,
              organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
              createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
            }),
            user: defaultManager,
            assignedBy: createDocument({ _id: "user_1", firstName: "Ada", lastName: "Admin", role: USER_ROLES.ADMIN }),
            assignedAt: new Date("2026-08-03T10:00:00.000Z"),
          }),
        ]).map((assignment) => createDocument(assignment));
      },
      createEventManagerAssignment: async (assignmentData) => {
        calls.createEventManagerAssignment.push(assignmentData);

        if (overrides.createAssignmentError) {
          throw overrides.createAssignmentError;
        }

        activeAssignment = createDocument({
          _id: "assignment_1",
          event: createDocument({
            _id: assignmentData.event,
            eventName: "Annual Event Summit",
            slug: "annual-event-summit",
            status: EVENT_STATUS.DRAFT,
            organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
            createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
          }),
          user: createDocument({
            _id: assignmentData.user,
            firstName: "Mia",
            lastName: "Manager",
            email: "mia@example.com",
            role: USER_ROLES.MANAGER,
            organization: "org_1",
          }),
          assignedBy: createDocument({
            _id: assignmentData.assignedBy,
            firstName: "Ada",
            lastName: "Admin",
            role: USER_ROLES.ADMIN,
          }),
          assignedAt: assignmentData.assignedAt,
        });

        return createDocument(activeAssignment);
      },
      deactivateEventManagerAssignment: async (eventId, userId, removedBy) => {
        calls.deactivateEventManagerAssignment.push({ eventId, userId, removedBy });

        if (!activeAssignment) {
          return null;
        }

        activeAssignment = createDocument({
          ...activeAssignment,
          removedAt: new Date("2026-08-10T10:00:00.000Z"),
          removedBy: createDocument({
            _id: removedBy,
            firstName: "Ada",
            lastName: "Admin",
            role: USER_ROLES.ADMIN,
          }),
        });

        return createDocument(activeAssignment);
      },
    },
  };

  return { dependencies, calls };
}

test("event manager service assigns a manager to an eligible event", async () => {
  const { dependencies, calls } = buildDependencies();

  const result = await assignManagerToEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      userId: "user_2",
    },
    dependencies
  );

  assert.equal(result.error, undefined);
  assert.equal(result.assignment.user.role, USER_ROLES.MANAGER);
  assert.equal(result.assignment.assignedBy.role, USER_ROLES.ADMIN);
  assert.equal(calls.createEventManagerAssignment.length, 1);
  assert.equal(calls.findActiveEventManagerAssignment.length, 1);
});

test("event manager service rejects non-manager assignments", async () => {
  const { dependencies } = buildDependencies({
    targetUser: {
      _id: "user_3",
      role: USER_ROLES.CUSTOMER,
      organization: "org_1",
    },
  });

  const result = await assignManagerToEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      userId: "user_3",
    },
    dependencies
  );

  assert.equal(result.error, "Only managers can be assigned to events");
  assert.equal(result.statusCode, 400);
});

test("event manager service rejects assignments to completed or canceled events", async () => {
  const canceledDependencies = buildDependencies({
    eventById: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      status: EVENT_STATUS.CANCELED,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
    },
  });

  const canceledResult = await assignManagerToEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      userId: "user_2",
    },
    canceledDependencies.dependencies
  );

  assert.equal(canceledResult.error, "Only draft, published, or postponed events can have managers assigned");
  assert.equal(canceledResult.statusCode, 400);

  const completedDependencies = buildDependencies({
    eventById: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      status: EVENT_STATUS.COMPLETED,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
    },
  });

  const completedResult = await assignManagerToEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      userId: "user_2",
    },
    completedDependencies.dependencies
  );

  assert.equal(completedResult.error, "Only draft, published, or postponed events can have managers assigned");
  assert.equal(completedResult.statusCode, 400);
});

test("event manager service blocks duplicate assignments", async () => {
  const { dependencies } = buildDependencies({
    activeAssignment: createDocument({
      _id: "assignment_1",
      event: createDocument({
        _id: "event_1",
        eventName: "Annual Event Summit",
        slug: "annual-event-summit",
        status: EVENT_STATUS.DRAFT,
        organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
        createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      }),
      user: createDocument({
        _id: "user_2",
        role: USER_ROLES.MANAGER,
        organization: "org_1",
      }),
      assignedBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      assignedAt: new Date("2026-08-01T10:00:00.000Z"),
    }),
  });

  dependencies.eventManagerAssignmentRepository.findActiveEventManagerAssignment = async () =>
    createDocument({
      _id: "assignment_1",
      event: createDocument({
        _id: "event_1",
        eventName: "Annual Event Summit",
        slug: "annual-event-summit",
        status: EVENT_STATUS.DRAFT,
        organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
        createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      }),
      user: createDocument({
        _id: "user_2",
        role: USER_ROLES.MANAGER,
        organization: "org_1",
      }),
      assignedBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      assignedAt: new Date("2026-08-01T10:00:00.000Z"),
    });

  const result = await assignManagerToEvent(
    "org_1",
    "user_1",
    "event_1",
    {
      userId: "user_2",
    },
    dependencies
  );

  assert.equal(result.error, "This manager is already assigned to this event");
  assert.equal(result.statusCode, 409);
});

test("event manager service lists assigned events and filters inaccessible statuses", async () => {
  const { dependencies, calls } = buildDependencies({
    authUser: {
      _id: "user_2",
      role: USER_ROLES.MANAGER,
      organization: "org_1",
    },
  });

  const result = await getManagerAssignedEvents(
    "org_1",
    "user_2",
    {
      page: "1",
      limit: "10",
    },
    dependencies
  );

  assert.equal(result.error, undefined);
  assert.equal(result.events.length, 2);
  assert.equal(result.events[0].organization, undefined);
  assert.equal(result.events[0].createdBy, undefined);
  assert.equal(result.pagination.page, 1);
  assert.equal(calls.findManagerAssignments.length, 1);
});

test("event manager service blocks non-assigned event access", async () => {
  const { dependencies } = buildDependencies({
    activeAssignment: null,
  });

  const result = await getManagerAssignedEventById("org_1", "user_2", "event_1", dependencies);

  assert.equal(result.error, "You do not have access to this resource");
  assert.equal(result.statusCode, 403);
});

test("event manager service removes access immediately after assignment removal", async () => {
  const { dependencies, calls } = buildDependencies({
    authUser: {
      _id: "user_1",
      role: USER_ROLES.ADMIN,
      organization: "org_1",
    },
    activeAssignment: createDocument({
      _id: "assignment_1",
      event: createDocument({
        _id: "event_1",
        eventName: "Annual Event Summit",
        slug: "annual-event-summit",
        status: EVENT_STATUS.DRAFT,
        organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
        createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      }),
      user: createDocument({
        _id: "user_2",
        role: USER_ROLES.MANAGER,
        organization: "org_1",
      }),
      assignedBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      assignedAt: new Date("2026-08-01T10:00:00.000Z"),
    }),
  });

  const removalResult = await removeManagerFromEvent("org_1", "user_1", "event_1", "user_2", dependencies);

  assert.equal(removalResult.error, undefined);
  assert.equal(removalResult.assignment.removedBy.role, USER_ROLES.ADMIN);
  assert.equal(calls.deactivateEventManagerAssignment.length, 1);

  dependencies.authRepository.findAuthUserById = async (userId) =>
    createDocument({
      _id: userId,
      role: USER_ROLES.MANAGER,
      organization: "org_1",
    });

  const accessResult = await getManagerAssignedEventById("org_1", "user_2", "event_1", dependencies);

  assert.equal(accessResult.error, "You do not have access to this resource");
  assert.equal(accessResult.statusCode, 403);
});

test("event manager service blocks cross-organization manager access", async () => {
  const { dependencies } = buildDependencies({
    authUser: {
      _id: "user_2",
      role: USER_ROLES.MANAGER,
      organization: "org_2",
    },
  });

  const result = await getManagerAssignedEvents("org_1", "user_2", {}, dependencies);

  assert.equal(result.error, "You cannot access another organization");
  assert.equal(result.statusCode, 403);
});

test("event manager validators accept valid ids and manager assignment payloads", () => {
  const assignmentResult = eventManagerAssignSchema.safeParse({
    userId: "507f1f77bcf86cd799439011",
  });
  const paramsResult = eventManagerIdParamSchema.safeParse({
    eventId: "507f1f77bcf86cd799439011",
    userId: "507f1f77bcf86cd799439012",
  });
  const queryResult = eventManagerListQuerySchema.safeParse({
    page: "2",
    limit: "25",
  });

  assert.equal(assignmentResult.success, true);
  assert.equal(paramsResult.success, true);
  assert.equal(queryResult.success, true);
  assert.equal(queryResult.data.page, 2);
  assert.equal(queryResult.data.limit, 25);
});
