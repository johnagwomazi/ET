import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import FormField from "../../components/forms/FormField";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import SearchInput from "../../components/dashboard/SearchInput";
import FilterSelect from "../../components/dashboard/FilterSelect";
import DataTable from "../../components/dashboard/DataTable";
import StatusBadge from "../../components/dashboard/StatusBadge";
import Avatar from "../../components/dashboard/Avatar";
import ActionMenu from "../../components/dashboard/ActionMenu";
import ConfirmationDialog from "../../components/dashboard/ConfirmationDialog";
import OrganizationMembersMobileCards from "../../components/organization/OrganizationMembersMobileCards";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useOrganizationPermissions } from "../../hooks/useOrganizationPermissions";
import { useSessionStore } from "../../store/useSessionStore";
import * as organizationService from "../../services/organization.service";
import * as eventService from "../../services/event.service";
import { formatDate } from "../../utils/formatters";
import { getOrganizationRoleLabel, getOrganizationRoleOptions } from "../../constants/organizationRoles.constants";
import { ORGANIZATION_PERMISSIONS } from "../../constants/organizationPermissions.constants";
import {
  buildOrganizationMemberActionItems,
  getOrganizationMemberDisplayName,
} from "../../utils/organizationMemberActions";

const TABLE_QUERY_LIMIT = 1000;

const initialQuery = {
  search: "",
  role: "",
  status: "",
  page: 1,
  limit: TABLE_QUERY_LIMIT,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const statusFilterOptions = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "PENDING_VERIFICATION", label: "Pending verification" },
];

const roleFilterOptions = [
  { value: "", label: "All roles" },
  ...getOrganizationRoleOptions(),
];

const inviteRoleOptions = [
  { value: "", label: "Select a role" },
  ...getOrganizationRoleOptions(),
];

function getCurrentUserId(currentUser) {
  return currentUser?._id || currentUser?.id || null;
}

function getMemberJoinedLabel(member) {
  return formatDate(member?.joinedAt);
}

function MemberSelectField({ label, value, onChange, options, error, disabled, helperText }) {
  return (
    <FormField label={label} error={error} helperText={helperText}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 outline-none transition focus:border-app-500 focus:ring-2 focus:ring-app-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

function OrganizationMembersPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const { hasPermission } = useOrganizationPermissions();
  const canViewMembers = hasPermission(ORGANIZATION_PERMISSIONS.MEMBERS_VIEW);
  const canInviteMembers = hasPermission(ORGANIZATION_PERMISSIONS.MEMBERS_INVITE);
  const canUpdateMemberRole = hasPermission(ORGANIZATION_PERMISSIONS.MEMBERS_UPDATE_ROLE);
  const canRemoveMembers = hasPermission(ORGANIZATION_PERMISSIONS.MEMBERS_REMOVE);

  const currentUserId = getCurrentUserId(currentUser);

  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState(initialQuery);
  const [searchValue, setSearchValue] = useState(initialQuery.search);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteErrors, setInviteErrors] = useState({});
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "MANAGER",
    eventIds: [],
  });
  const [organizationEvents, setOrganizationEvents] = useState([]);
  const [assignmentMember, setAssignmentMember] = useState(null);
  const [assignmentEventIds, setAssignmentEventIds] = useState([]);
  const [isUpdatingAssignments, setIsUpdatingAssignments] = useState(false);
  const [roleMember, setRoleMember] = useState(null);
  const [roleForm, setRoleForm] = useState({
    role: "",
  });
  const [roleErrors, setRoleErrors] = useState({});
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const queryRef = useRef(initialQuery);

  const debouncedSearch = useDebouncedValue(searchValue, 350);

  async function loadMembers(overrides = {}) {
    const nextQuery = {
      ...queryRef.current,
      ...overrides,
      limit: TABLE_QUERY_LIMIT,
    };

    queryRef.current = nextQuery;
    setQuery(nextQuery);
    setIsLoading(true);
    setError(null);

    try {
      const response = await organizationService.getOrganizationMembers(nextQuery);
      setMembers(response?.members || []);
      return response;
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load members";
      setError(message);
      throw loadError;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMembers().catch(() => {});
    async function loadAssignableEvents() {
      const allEvents = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await eventService.getOrganizationEvents({ page, limit: 100, sortBy: "startAt", sortOrder: "asc" });
        allEvents.push(...(response?.events || []));
        totalPages = response?.pagination?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);
      setOrganizationEvents(allEvents.filter((event) => ["DRAFT", "PUBLISHED", "POSTPONED"].includes(event.status)));
    }
    loadAssignableEvents().catch(() => setOrganizationEvents([]));
  }, []);

  useEffect(() => {
    if (debouncedSearch === queryRef.current.search) {
      return;
    }

    loadMembers({
      search: debouncedSearch,
      page: 1,
    }).catch(() => {});
  }, [debouncedSearch]);

  function handleRefresh() {
    loadMembers().catch(() => {});
  }

  function handleSearchChange(event) {
    setSearchValue(event.target.value);
  }

  function handleRoleFilterChange(event) {
    loadMembers({
      role: event.target.value,
      page: 1,
    }).catch(() => {});
  }

  function handleStatusFilterChange(event) {
    loadMembers({
      status: event.target.value,
      page: 1,
    }).catch(() => {});
  }

  function handleSort(columnKey) {
    const nextSortOrder =
      queryRef.current.sortBy === columnKey && queryRef.current.sortOrder === "asc" ? "desc" : "asc";

    loadMembers({
      sortBy: columnKey,
      sortOrder: nextSortOrder,
      page: 1,
    }).catch(() => {});
  }

  function openInviteMemberModal() {
    setInviteErrors({});
    setInviteForm({
      email: "",
      role: "MANAGER",
      eventIds: [],
    });
    setIsInviteOpen(true);
  }

  function closeInviteMemberModal() {
    setIsInviteOpen(false);
    setInviteErrors({});
  }

  function openAssignmentModal(member) {
    setAssignmentMember(member);
    setAssignmentEventIds((member.assignedEvents || []).map((event) => String(event.id)));
  }

  function toggleAssignment(eventId) {
    setAssignmentEventIds((current) => current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId]);
  }

  async function handleUpdateAssignments() {
    if (!assignmentMember) return;
    setIsUpdatingAssignments(true);
    try {
      await organizationService.updateManagerEventAssignments(assignmentMember.id, { eventIds: assignmentEventIds });
      toast.success("Manager assignments updated");
      setAssignmentMember(null);
      await loadMembers();
    } catch (updateError) {
      toast.error(updateError.message || "Unable to update assignments");
    } finally {
      setIsUpdatingAssignments(false);
    }
  }
  function openRoleModal(member) {
    setRoleMember(member);
    setRoleForm({
      role: member?.role || "",
    });
    setRoleErrors({});
  }

  function closeRoleModal() {
    setRoleMember(null);
    setRoleErrors({});
  }

  function openRemoveDialog(member) {
    setMemberToRemove(member);
  }

  function closeRemoveDialog() {
    setMemberToRemove(null);
  }

  function updateInviteField(field, value) {
    setInviteForm((current) => ({
      ...current,
      [field]: value,
    }));

    setInviteErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function updateRoleField(value) {
    setRoleForm({ role: value });
    setRoleErrors((current) => ({
      ...current,
      role: undefined,
    }));
  }

  function validateInviteForm() {
    const nextErrors = {};

    if (!inviteForm.email.trim()) {
      nextErrors.email = "Email is required";
    }

    if (!inviteForm.role) {
      nextErrors.role = "Role is required";
    }
    if (inviteForm.role === "MANAGER" && inviteForm.eventIds.length === 0) {
      nextErrors.eventIds = "Select at least one event";
    }

    setInviteErrors(nextErrors);
    return nextErrors;
  }

  function validateRoleForm() {
    const nextErrors = {};

    if (!roleForm.role) {
      nextErrors.role = "Role is required";
    }

    setRoleErrors(nextErrors);
    return nextErrors;
  }

  async function handleInviteMember(event) {
    event?.preventDefault?.();

    if (!canInviteMembers) {
      return;
    }

    const nextErrors = validateInviteForm();

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmittingInvite(true);

    try {
      await organizationService.inviteOrganizationMember({
        email: inviteForm.email.trim(),
        role: inviteForm.role,
        eventIds: inviteForm.role === "MANAGER" ? inviteForm.eventIds : [],
      });

      toast.success("Invitation sent successfully");
      closeInviteMemberModal();
      await loadMembers();
    } catch (inviteError) {
      const message = inviteError instanceof Error ? inviteError.message : "Unable to invite member";
      toast.error(message);
    } finally {
      setIsSubmittingInvite(false);
    }
  }

  async function handleUpdateMemberRole(event) {
    event?.preventDefault?.();

    if (!roleMember) {
      return;
    }

    const nextErrors = validateRoleForm();

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsUpdatingRole(true);

    try {
      await organizationService.updateOrganizationMemberRole(roleMember.id, {
        role: roleForm.role,
      });

      toast.success("Member role updated successfully");
      closeRoleModal();
      await loadMembers();
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Unable to update member role";
      toast.error(message);
    } finally {
      setIsUpdatingRole(false);
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove) {
      return;
    }

    setIsRemovingMember(true);

    try {
      await organizationService.removeOrganizationMember(memberToRemove.id);

      toast.success("Member removed successfully");
      closeRemoveDialog();
      await loadMembers();
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : "Unable to remove member";
      toast.error(message);
    } finally {
      setIsRemovingMember(false);
    }
  }

  if (error && members.length === 0) {
    return (
      <ErrorState
        title="Members unavailable"
        message={error}
        onRetry={() => {
          loadMembers().catch(() => {});
        }}
      />
    );
  }

  if (!canViewMembers && members.length === 0) {
    return (
      <ErrorState
        title="Members unavailable"
        message="You do not have permission to view organization members."
      />
    );
  }

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (member) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={getOrganizationMemberDisplayName(member)} size="sm" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-white">{getOrganizationMemberDisplayName(member)}</p>
              {member.isPrimaryAdmin ? (
                <span className="rounded-full bg-app-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-200">
                  Primary admin
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (member) => member.email,
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (member) => getOrganizationRoleLabel(member.role),
    },
    {
      key: "accountStatus",
      label: "Status",
      sortable: true,
      render: (member) => <StatusBadge status={member.accountStatus} />,
    },
    {
      key: "assignments",
      label: "Assigned events",
      sortable: false,
      render: (member) => member.role === "MANAGER" ? `${member.assignedEvents?.length || 0} event(s)` : "—",
    },    {
      key: "joinedAt",
      label: "Joined",
      sortable: true,
      render: (member) => getMemberJoinedLabel(member),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      cellClassName: "w-0",
      render: (member) => {
        const actionItems = buildOrganizationMemberActionItems(
          member,
          {
            onManageAssignments: openAssignmentModal,
            onChangeRole: openRoleModal,
            onRemove: openRemoveDialog,
          },
          {
            canManageAssignments: canUpdateMemberRole,
            canUpdateRole: canUpdateMemberRole,
            canRemoveMember: canRemoveMembers,
          },
          currentUserId
        );

        return <ActionMenu items={actionItems} showLabel label="Actions" />;
      },
    },
  ];

  const emptyState = (
    <EmptyState
      title="No members found"
      message="Try adjusting your search or filters to find more members."
    />
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Organization administration"
        title="Members"
        description="Search members, filter by role or status, and manage access from a scrollable table."
        actions={[
          ...(canInviteMembers
            ? [
                {
                  label: "Invite member",
                  onClick: openInviteMemberModal,
                },
              ]
            : []),
          {
            label: "Refresh",
            variant: "secondary",
            onClick: handleRefresh,
            isLoading,
          },
        ]}
      />

      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="grid gap-4 xl:grid-cols-3">
          <SearchInput value={searchValue} onChange={handleSearchChange} />
          <FilterSelect
            label="Role filter"
            value={query.role || ""}
            onChange={handleRoleFilterChange}
            options={roleFilterOptions}
          />
          <FilterSelect
            label="Status filter"
            value={query.status || ""}
            onChange={handleStatusFilterChange}
            options={statusFilterOptions}
          />
        </div>
      </Card>

      <div className="hidden md:block">
        <div className="max-h-[36rem] overflow-auto rounded-3xl border border-slate-800/70">
          <DataTable
            rowKey="id"
            columns={columns}
            data={members}
            isLoading={isLoading}
            sortBy={query.sortBy}
            sortOrder={query.sortOrder}
            onSort={handleSort}
            emptyState={emptyState}
          />
        </div>
      </div>

      <OrganizationMembersMobileCards
        members={members}
        isLoading={isLoading}
        onManageAssignments={openAssignmentModal}
        onChangeRole={openRoleModal}
        onRemove={openRemoveDialog}
        canManageAssignments={canUpdateMemberRole}
        canUpdateRole={canUpdateMemberRole}
        canRemoveMember={canRemoveMembers}
        currentUserId={currentUserId}
        emptyState={emptyState}
      />

      <Modal
        open={isInviteOpen}
        title="Invite member"
        onClose={closeInviteMemberModal}
        className="max-w-lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={closeInviteMemberModal} disabled={isSubmittingInvite}>
              Cancel
            </Button>
            <Button onClick={handleInviteMember} isLoading={isSubmittingInvite} loadingText="Inviting...">
              Invite member
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleInviteMember}>
          <Input
            label="Member email"
            type="email"
            value={inviteForm.email}
            onChange={(event) => updateInviteField("email", event.target.value)}
            error={inviteErrors.email}
            placeholder="member@example.com"
          />

          <MemberSelectField
            label="Role"
            value={inviteForm.role}
            onChange={(event) => updateInviteField("role", event.target.value)}
            options={inviteRoleOptions}
            error={inviteErrors.role}
            helperText="Choose the role this member should receive."
          />
          {inviteForm.role === "MANAGER" ? (
            <FormField label="Assigned events" error={inviteErrors.eventIds} helperText="Select one or more events this manager can access.">
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3">
                {organizationEvents.map((event) => (
                  <label key={event._id || event.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-900">
                    <input type="checkbox" checked={inviteForm.eventIds.includes(String(event._id || event.id))} onChange={() => updateInviteField("eventIds", inviteForm.eventIds.includes(String(event._id || event.id)) ? inviteForm.eventIds.filter((id) => id !== String(event._id || event.id)) : [...inviteForm.eventIds, String(event._id || event.id)])} className="h-4 w-4 accent-violet-500" />
                    <span className="min-w-0 truncate text-sm text-slate-200">{event.eventName}</span>
                  </label>
                ))}
                {!organizationEvents.length ? <p className="text-sm text-slate-500">No assignable events are available.</p> : null}
              </div>
            </FormField>
          ) : null}
        </form>
      </Modal>


      <Modal
        open={Boolean(assignmentMember)}
        title="Manage event assignments"
        onClose={() => setAssignmentMember(null)}
        className="max-w-xl"
        footer={<div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setAssignmentMember(null)}>Cancel</Button><Button onClick={handleUpdateAssignments} isLoading={isUpdatingAssignments}>Save assignments</Button></div>}
      >
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {organizationEvents.map((event) => {
            const eventId = String(event._id || event.id);
            return <label key={eventId} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 p-3 hover:bg-slate-900"><input type="checkbox" checked={assignmentEventIds.includes(eventId)} onChange={() => toggleAssignment(eventId)} className="h-4 w-4 accent-violet-500" /><span className="text-sm text-slate-200">{event.eventName}</span></label>;
          })}
        </div>
      </Modal>      <Modal
        open={Boolean(roleMember)}
        title="Change member role"
        onClose={closeRoleModal}
        className="max-w-lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={closeRoleModal} disabled={isUpdatingRole}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMemberRole} isLoading={isUpdatingRole} loadingText="Saving...">
              Save changes
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleUpdateMemberRole}>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <Avatar name={getOrganizationMemberDisplayName(roleMember)} size="md" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{getOrganizationMemberDisplayName(roleMember)}</p>
              <p className="truncate text-sm text-slate-400">{roleMember?.email}</p>
            </div>
          </div>

          <MemberSelectField
            label="Role"
            value={roleForm.role}
            onChange={(event) => updateRoleField(event.target.value)}
            options={getOrganizationRoleOptions()}
            error={roleErrors.role}
            helperText="Select the new organization role for this member."
          />
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(memberToRemove)}
        title="Remove member"
        message={
          memberToRemove
            ? `Remove ${getOrganizationMemberDisplayName(memberToRemove)} from this organization? Their access will be revoked.`
            : undefined
        }
        confirmText="Remove"
        tone="danger"
        isLoading={isRemovingMember}
        onCancel={closeRemoveDialog}
        onConfirm={handleRemoveMember}
      />
    </div>
  );
}

export default OrganizationMembersPage;
