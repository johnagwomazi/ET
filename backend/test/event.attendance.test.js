import test from "node:test";
import assert from "node:assert/strict";

import { EVENT_STATUS } from "../src/constants/eventStatus.constants.js";
import { USER_ROLES } from "../src/constants/roles.constants.js";
import {
  getEventAttendance,
  getEventAttendanceCount,
  getRecentEventAttendance,
  recordEventAttendance,
} from "../src/services/eventAttendance.service.js";
import {
  exportAttendanceExcel,
  exportAttendancePdf,
} from "../src/services/eventAttendanceReport.service.js";
import {
  attendanceCreateSchema,
  attendanceEventIdParamSchema,
  attendanceListQuerySchema,
} from "../src/validators/attendance.validator.js";
import { buildAttendanceReportRows } from "../src/utils/attendanceExport.util.js";
import EventAttendance from "../src/models/eventAttendance.model.js";

function createDocument(data) {
  return {
    ...data,
    toObject() {
      return { ...data };
    },
  };
}

function buildAttendanceStore(initialItems = []) {
  return initialItems.map((item) => createDocument(item));
}

function buildDependencies(overrides = {}) {
  const calls = {
    findAuthUserById: [],
    findOrganizationDetailsById: [],
    findEventByIdAndOrganization: [],
    findActiveEventManagerAssignment: [],
    findAttendanceByEventAndEmail: [],
    countAttendanceByEvent: [],
    countEventAttendance: [],
    findEventAttendance: [],
    createEventAttendance: [],
    findTicketIdsByEventAndReference: [],
  };

  const attendanceStore = buildAttendanceStore(overrides.existingAttendances || []);
  const defaultEvent = createDocument({
    _id: "event_1",
    eventName: "Annual Event Summit",
    slug: "annual-event-summit",
    status: EVENT_STATUS.PUBLISHED,
    capacity: 100,
    organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
    createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
  });

  const defaultManagerAssignment = createDocument({
    _id: "assignment_1",
    event: defaultEvent,
    user: createDocument({
      _id: "user_2",
      role: USER_ROLES.MANAGER,
      organization: "org_1",
    }),
    assignedBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
    assignedAt: new Date("2026-08-01T10:00:00.000Z"),
  });

  const dependencies = {
    authRepository: {
      findAuthUserById: async (userId) => {
        calls.findAuthUserById.push(userId);

        if (overrides.authUser === null) {
          return null;
        }

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
    eventManagerAssignmentRepository: {
      findActiveEventManagerAssignment: async (eventId, userId) => {
        calls.findActiveEventManagerAssignment.push({ eventId, userId });

        if (overrides.activeAssignment === null) {
          return null;
        }

        if (overrides.activeAssignment !== undefined) {
          return createDocument(overrides.activeAssignment);
        }

        if (overrides.authUser?.role === USER_ROLES.MANAGER && overrides.authUser?._id === userId) {
          return createDocument(defaultManagerAssignment);
        }

        return null;
      },
    },
    eventAttendanceRepository: {
      findAttendanceByEventAndEmail: async (eventId, attendeeEmail) => {
        calls.findAttendanceByEventAndEmail.push({ eventId, attendeeEmail });
        return attendanceStore.find(
          (item) => item.event === eventId && item.attendeeEmail === attendeeEmail
        ) || null;
      },
      countAttendanceByEvent: async (eventId) => {
        calls.countAttendanceByEvent.push(eventId);
        return attendanceStore.filter((item) => item.event === eventId).length;
      },
      countEventAttendance: async (filter) => {
        calls.countEventAttendance.push(filter);
        return attendanceStore.filter((item) => {
          if (item.event !== filter.event) {
            return false;
          }

          if (!filter.$or) {
            return true;
          }

          return filter.$or.some((condition) => {
            const [field, matcher] = Object.entries(condition)[0];

            if (matcher instanceof RegExp) {
              return matcher.test(String(item[field] || ""));
            }

            return matcher?.$in?.some((value) => String(value) === String(item[field])) || false;
          });
        }).length;
      },
      findEventAttendance: async (filter, options) => {
        calls.findEventAttendance.push({ filter, options });
        const matches = attendanceStore.filter((item) => {
          if (item.event !== filter.event) {
            return false;
          }

          if (!filter.$or) {
            return true;
          }

          return filter.$or.some((condition) => {
            const [field, matcher] = Object.entries(condition)[0];

            if (matcher instanceof RegExp) {
              return matcher.test(String(item[field] || ""));
            }

            return matcher?.$in?.some((value) => String(value) === String(item[field])) || false;
          });
        });

        const sorted = matches.slice().sort((left, right) => {
          const leftTime = new Date(left.checkedInAt).getTime();
          const rightTime = new Date(right.checkedInAt).getTime();
          return rightTime - leftTime;
        });

        const skipped = sorted.slice(options.skip || 0);
        const limited = Number.isFinite(options.limit) ? skipped.slice(0, options.limit) : skipped;
        return limited.map((item) => createDocument(item));
      },
      createEventAttendance: async (attendanceData) => {
        calls.createEventAttendance.push(attendanceData);

        const duplicate = attendanceStore.find(
          (item) => item.event === attendanceData.event && item.attendeeEmail === attendanceData.attendeeEmail
        );

        if (duplicate) {
          const error = new Error("duplicate");
          error.code = 11000;
          throw error;
        }

        const created = createDocument({
          _id: `attendance_${attendanceStore.length + 1}`,
          ...attendanceData,
          checkedInBy: createDocument(
            overrides.authUser || {
              _id: attendanceData.checkedInBy,
              role: USER_ROLES.ADMIN,
              organization: "org_1",
            }
          ),
        });

        attendanceStore.push(created);
        return created;
      },
    },
    ticketRepository: {
      findTicketIdsByEventAndReference: async (eventId, reference) => {
        calls.findTicketIdsByEventAndReference.push({ eventId, reference });
        return overrides.ticketSearchIds || [];
      },
    },
  };

  return { dependencies, calls, attendanceStore };
}

test("attendance validators accept valid payloads and reject bad ids", () => {
  const createResult = attendanceCreateSchema.safeParse({
    name: "John Doe",
    phone: "08012345678",
    email: "john@example.com",
  });
  const paramsResult = attendanceEventIdParamSchema.safeParse({
    eventId: "507f1f77bcf86cd799439011",
  });
  const queryResult = attendanceListQuerySchema.safeParse({
    page: "2",
    limit: "25",
    search: "john",
  });

  assert.equal(createResult.success, true);
  assert.equal(paramsResult.success, true);
  assert.equal(queryResult.success, true);
  assert.equal(queryResult.data.page, 2);
  assert.equal(queryResult.data.limit, 25);
});

test("attendance indexes protect ticket check-ins while preserving legacy records", () => {
  const indexes = EventAttendance.schema.indexes();
  const ticketIndex = indexes.find(([, options]) => options.name === "unique_ticket_attendance");
  const manualIndex = indexes.find(([, options]) => options.name === "unique_manual_attendance_email_per_event");

  assert.deepEqual(ticketIndex[0], { ticket: 1 });
  assert.equal(ticketIndex[1].unique, true);
  assert.deepEqual(ticketIndex[1].partialFilterExpression, { ticket: { $type: "objectId" } });
  assert.deepEqual(manualIndex[0], { event: 1, attendeeEmail: 1 });
  assert.deepEqual(manualIndex[1].partialFilterExpression, { ticket: { $type: "null" } });
});

test("recording attendance works for an organization admin", async () => {
  const { dependencies, calls, attendanceStore } = buildDependencies({
    authUser: {
      _id: "user_1",
      role: USER_ROLES.ADMIN,
      organization: "org_1",
    },
  });

  const result = await recordEventAttendance(
    "org_1",
    "user_1",
    "event_1",
    {
      name: "John Doe",
      phone: "08012345678",
      email: "john@example.com",
    },
    dependencies
  );

  assert.equal(result.error, undefined);
  assert.equal(result.totalAttendees, 1);
  assert.equal(result.attendance.name, "John Doe");
  assert.equal(result.attendance.phone, "08012345678");
  assert.equal(result.attendance.email, "john@example.com");
  assert.equal(result.attendance.checkedInBy.role, USER_ROLES.ADMIN);
  assert.equal(result.attendance.checkedInBy.password, undefined);
  assert.equal(calls.createEventAttendance.length, 1);
  assert.equal(attendanceStore.length, 1);
  assert.equal(result.attendance.checkedInAt instanceof Date, true);
});

test("recording attendance works for an assigned manager only", async () => {
  const { dependencies } = buildDependencies({
    authUser: {
      _id: "user_2",
      role: USER_ROLES.MANAGER,
      organization: "org_1",
    },
  });

  const result = await recordEventAttendance(
    "org_1",
    "user_2",
    "event_1",
    {
      name: "Jane Doe",
      phone: "08012345679",
      email: "jane@example.com",
    },
    dependencies
  );

  assert.equal(result.error, undefined);
  assert.equal(result.totalAttendees, 1);
  assert.equal(result.attendance.checkedInBy.role, USER_ROLES.MANAGER);
});

test("unassigned or cross-organization managers cannot check in attendees", async () => {
  const unassignedDependencies = buildDependencies({
    authUser: {
      _id: "user_2",
      role: USER_ROLES.MANAGER,
      organization: "org_1",
    },
    activeAssignment: null,
  });

  const unassignedResult = await recordEventAttendance(
    "org_1",
    "user_2",
    "event_1",
    {
      name: "Guest One",
      phone: "08012345670",
      email: "guest1@example.com",
    },
    unassignedDependencies.dependencies
  );

  assert.equal(unassignedResult.error, "You do not have access to this resource");
  assert.equal(unassignedResult.statusCode, 403);

  const crossOrgDependencies = buildDependencies({
    authUser: {
      _id: "user_3",
      role: USER_ROLES.MANAGER,
      organization: "org_2",
    },
  });

  const crossOrgResult = await recordEventAttendance(
    "org_1",
    "user_3",
    "event_1",
    {
      name: "Guest Two",
      phone: "08012345671",
      email: "guest2@example.com",
    },
    crossOrgDependencies.dependencies
  );

  assert.equal(crossOrgResult.error, "You cannot access another organization");
  assert.equal(crossOrgResult.statusCode, 403);
});

test("attendance check-in is blocked for draft, postponed, canceled, and completed events", async () => {
  const statuses = [
    EVENT_STATUS.DRAFT,
    EVENT_STATUS.POSTPONED,
    EVENT_STATUS.CANCELED,
    EVENT_STATUS.COMPLETED,
  ];

  for (const status of statuses) {
    const { dependencies } = buildDependencies({
      eventById: {
        _id: "event_1",
        eventName: "Annual Event Summit",
        slug: "annual-event-summit",
        status,
        capacity: 100,
        organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
        createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      },
    });

    const result = await recordEventAttendance(
      "org_1",
      "user_1",
      "event_1",
      {
        name: "John Doe",
        phone: "08012345678",
        email: `john-${status.toLowerCase()}@example.com`,
      },
      dependencies
    );

    assert.equal(result.error, "Only published events can accept attendance");
    assert.equal(result.statusCode, 400);
  }
});

test("duplicate attendance is rejected and capacity is enforced", async () => {
  const { dependencies, attendanceStore } = buildDependencies({
    existingAttendances: [
      {
        _id: "attendance_1",
        event: "event_1",
        attendeeName: "Existing Person",
        attendeePhone: "08012345678",
        attendeeEmail: "existing@example.com",
        checkedInAt: new Date("2026-08-10T10:00:00.000Z"),
        checkedInBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      },
    ],
    authUser: {
      _id: "user_1",
      role: USER_ROLES.ADMIN,
      organization: "org_1",
    },
    eventById: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      status: EVENT_STATUS.PUBLISHED,
      capacity: 1,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
    },
  });

  const duplicateResult = await recordEventAttendance(
    "org_1",
    "user_1",
    "event_1",
    {
      name: "Existing Person",
      phone: "08012345678",
      email: "existing@example.com",
    },
    dependencies
  );

  assert.equal(duplicateResult.error, "This attendee is already checked in");
  assert.equal(duplicateResult.statusCode, 409);

  const capacityResult = await recordEventAttendance(
    "org_1",
    "user_1",
    "event_1",
    {
      name: "Late Guest",
      phone: "08012345679",
      email: "late@example.com",
    },
    dependencies
  );

  assert.equal(capacityResult.error, "Event capacity has been reached");
  assert.equal(capacityResult.statusCode, 409);
  assert.equal(attendanceStore.length, 1);
});

test("attendance list remains available after event completion and survives manager removal", async () => {
  const attendanceRecord = {
    _id: "attendance_1",
    event: "event_1",
    attendeeName: "John Doe",
    attendeePhone: "08012345678",
    attendeeEmail: "john@example.com",
    checkedInAt: new Date("2026-08-10T10:00:00.000Z"),
    checkedInBy: createDocument({
      _id: "user_2",
      firstName: "Mia",
      lastName: "Manager",
      email: "mia@example.com",
      role: USER_ROLES.MANAGER,
      organization: "org_1",
    }),
  };

  const { dependencies, attendanceStore } = buildDependencies({
    authUser: {
      _id: "user_2",
      role: USER_ROLES.MANAGER,
      organization: "org_1",
    },
    eventById: {
      _id: "event_1",
      eventName: "Annual Event Summit",
      slug: "annual-event-summit",
      status: EVENT_STATUS.COMPLETED,
      capacity: 100,
      organization: createDocument({ _id: "org_1", status: "APPROVED", isDeleted: false, primaryAdmin: "user_1" }),
      createdBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
    },
    activeAssignment: createDocument({
      _id: "assignment_1",
      event: createDocument({
        _id: "event_1",
        eventName: "Annual Event Summit",
        slug: "annual-event-summit",
        status: EVENT_STATUS.COMPLETED,
        capacity: 100,
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
    existingAttendances: [attendanceRecord],
  });

  const result = await getEventAttendance("org_1", "user_2", "event_1", {}, dependencies);

  assert.equal(result.error, undefined);
  assert.equal(result.attendance.length, 1);
  assert.equal(result.totalAttendees, 1);
  assert.equal(result.attendance[0].checkedInBy.role, USER_ROLES.MANAGER);
  assert.equal(result.attendance[0].checkedInBy.password, undefined);

  attendanceStore[0].checkedInBy = createDocument({
    _id: "user_2",
    firstName: "Mia",
    lastName: "Manager",
    email: "mia@example.com",
    role: USER_ROLES.MANAGER,
    organization: "org_1",
  });

  dependencies.eventManagerAssignmentRepository.findActiveEventManagerAssignment = async () => null;

  const removedManagerResult = await getEventAttendance("org_1", "user_2", "event_1", {}, dependencies);
  assert.equal(removedManagerResult.error, "You do not have access to this resource");
  assert.equal(removedManagerResult.statusCode, 403);

  const adminResult = await getEventAttendance(
    "org_1",
    "user_1",
    "event_1",
    {},
    {
      ...dependencies,
      authRepository: {
        findAuthUserById: async () => createDocument({
          _id: "user_1",
          role: USER_ROLES.ADMIN,
          organization: "org_1",
        }),
      },
    }
  );

  assert.equal(adminResult.error, undefined);
  assert.equal(adminResult.attendance.length, 1);
  assert.equal(adminResult.attendance[0].checkedInBy.role, USER_ROLES.MANAGER);
  assert.equal(attendanceStore.length, 1);
});

test("cross-organization attendance access is blocked and search is applied", async () => {
  const { dependencies } = buildDependencies({
    authUser: {
      _id: "user_9",
      role: USER_ROLES.ADMIN,
      organization: "org_2",
    },
    existingAttendances: [
      {
        _id: "attendance_1",
        event: "event_1",
        attendeeName: "Searchable Person",
        attendeePhone: "08099999999",
        attendeeEmail: "search@example.com",
        checkedInAt: new Date("2026-08-10T10:00:00.000Z"),
        checkedInBy: createDocument({
          _id: "user_1",
          role: USER_ROLES.ADMIN,
          organization: "org_1",
        }),
      },
    ],
  });

  const blockedResult = await getEventAttendance("org_1", "user_9", "event_1", {}, dependencies);
  assert.equal(blockedResult.error, "You cannot access another organization");
  assert.equal(blockedResult.statusCode, 403);

  const searchResult = await getEventAttendance(
    "org_1",
    "user_1",
    "event_1",
    {
      search: "search@example.com",
    },
    {
      ...dependencies,
      authRepository: {
        findAuthUserById: async () => createDocument({
          _id: "user_1",
          role: USER_ROLES.ADMIN,
          organization: "org_1",
        }),
      },
    }
  );

  assert.equal(searchResult.attendance.length, 1);
  assert.equal(searchResult.totalAttendees, 1);
  assert.equal(searchResult.attendance[0].email, "search@example.com");
});

test("attendance count endpoint returns the total attendee count", async () => {
  const { dependencies } = buildDependencies({
    authUser: {
      _id: "user_1",
      role: USER_ROLES.ADMIN,
      organization: "org_1",
    },
    existingAttendances: [
      {
        _id: "attendance_1",
        event: "event_1",
        attendeeName: "One",
        attendeePhone: "08012345000",
        attendeeEmail: "one@example.com",
        checkedInAt: new Date("2026-08-10T10:00:00.000Z"),
        checkedInBy: createDocument({
          _id: "user_1",
          role: USER_ROLES.ADMIN,
          organization: "org_1",
        }),
      },
      {
        _id: "attendance_2",
        event: "event_1",
        attendeeName: "Two",
        attendeePhone: "08012345001",
        attendeeEmail: "two@example.com",
        checkedInAt: new Date("2026-08-10T10:01:00.000Z"),
        checkedInBy: createDocument({
          _id: "user_1",
          role: USER_ROLES.ADMIN,
          organization: "org_1",
        }),
      },
    ],
  });

  const result = await getEventAttendanceCount("org_1", "user_1", "event_1", dependencies);

  assert.equal(result.error, undefined);
  assert.equal(result.totalAttendees, 2);
});

test("recent attendance is bounded, newest first, and ticket references are searchable", async () => {
  const { dependencies } = buildDependencies({
    ticketSearchIds: ["ticket_2"],
    existingAttendances: [
      {
        _id: "attendance_1",
        event: "event_1",
        attendeeName: "Older Guest",
        attendeePhone: "08012345000",
        attendeeEmail: "older@example.com",
        ticket: "ticket_1",
        checkedInAt: new Date("2026-08-10T10:00:00.000Z"),
        checkedInBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      },
      {
        _id: "attendance_2",
        event: "event_1",
        attendeeName: "Newer Guest",
        attendeePhone: "08012345001",
        attendeeEmail: "newer@example.com",
        ticket: "ticket_2",
        checkedInAt: new Date("2026-08-10T10:05:00.000Z"),
        checkedInBy: createDocument({ _id: "user_1", role: USER_ROLES.ADMIN, organization: "org_1" }),
      },
    ],
  });

  const recent = await getRecentEventAttendance("org_1", "user_1", "event_1", { limit: 1 }, dependencies);
  const searched = await getEventAttendance(
    "org_1",
    "user_1",
    "event_1",
    { search: "tkt_newer" },
    dependencies
  );

  assert.equal(recent.recentCheckIns.length, 1);
  assert.equal(recent.recentCheckIns[0].name, "Newer Guest");
  assert.equal(recent.totalAttendees, 2);
  assert.equal(searched.attendance.length, 1);
  assert.equal(searched.attendance[0].ticket, "ticket_2");
});

test("attendance reports can be exported as pdf and excel", async () => {
  const { dependencies } = buildDependencies({
    authUser: {
      _id: "user_1",
      role: USER_ROLES.ADMIN,
      organization: "org_1",
    },
    existingAttendances: [
      {
        _id: "attendance_1",
        event: "event_1",
        attendeeName: "Export One",
        attendeePhone: "08012345000",
        attendeeEmail: "export1@example.com",
        checkedInAt: new Date("2026-08-10T10:00:00.000Z"),
        checkedInBy: createDocument({
          _id: "user_1",
          firstName: "Ada",
          lastName: "Admin",
          email: "ada@example.com",
          role: USER_ROLES.ADMIN,
          organization: "org_1",
        }),
        ticket: createDocument({
          _id: "ticket_1",
          reference: "tkt_export_1",
          status: "USED",
          ticketType: createDocument({ _id: "type_1", name: "VIP" }),
          order: createDocument({ _id: "order_1", reference: "ord_export_1" }),
        }),
        order: createDocument({ _id: "order_1", reference: "ord_export_1" }),
      },
    ],
  });

  const pdfResult = await exportAttendancePdf("org_1", "user_1", "event_1", {}, dependencies);
  const excelResult = await exportAttendanceExcel("org_1", "user_1", "event_1", {}, dependencies);

  assert.equal(pdfResult.error, undefined);
  assert.equal(pdfResult.contentType, "application/pdf");
  assert.equal(pdfResult.filename, "annual-event-summit-attendance.pdf");
  assert.equal(pdfResult.buffer.slice(0, 4).toString("latin1"), "%PDF");

  assert.equal(excelResult.error, undefined);
  assert.equal(
    excelResult.contentType,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  assert.equal(excelResult.filename, "annual-event-summit-attendance.xlsx");
  assert.equal(excelResult.buffer.slice(0, 2).toString("latin1"), "PK");

  const [row] = buildAttendanceReportRows([{
    attendeeName: "Export One",
    attendeePhone: "08012345000",
    attendeeEmail: "export1@example.com",
    checkedInAt: new Date("2026-08-10T10:00:00.000Z"),
    checkedInBy: { firstName: "Ada", lastName: "Admin" },
    ticket: {
      reference: "tkt_export_1",
      status: "USED",
      ticketType: { name: "VIP" },
      order: { reference: "ord_export_1" },
    },
  }]);
  assert.equal(row.ticketReference, "tkt_export_1");
  assert.equal(row.ticketType, "VIP");
  assert.equal(row.orderReference, "ord_export_1");
});

test("attendance exports enforce authorization and organization isolation", async () => {
  const unauthorizedDependencies = buildDependencies({
    authUser: null,
  });

  const unauthenticatedResult = await exportAttendancePdf(
    "org_1",
    "user_1",
    "event_1",
    {},
    unauthorizedDependencies.dependencies
  );

  assert.equal(unauthenticatedResult.statusCode, 401);

  const crossOrganizationDependencies = buildDependencies({
    authUser: {
      _id: "user_9",
      role: USER_ROLES.ADMIN,
      organization: "org_2",
    },
  });

  const crossOrganizationResult = await exportAttendanceExcel(
    "org_1",
    "user_9",
    "event_1",
    {},
    crossOrganizationDependencies.dependencies
  );

  assert.equal(crossOrganizationResult.statusCode, 403);
});
