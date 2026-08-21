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
    role: "",
  });
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
      role: "",
    });
    setIsInviteOpen(true);
  }

  function closeInviteMemberModal() {
    setIsInviteOpen(false);
    setInviteErrors({});
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
      });

      toast.success("Member invited successfully");
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
            onChangeRole: openRoleModal,
            onRemove: openRemoveDialog,
          },
          {
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
        onChangeRole={openRoleModal}
        onRemove={openRemoveDialog}
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
        </form>
      </Modal>

      <Modal
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
