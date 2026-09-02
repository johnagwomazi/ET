import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, RotateCcw, ShieldOff, ShieldAlert, UserCog } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import SearchInput from "../../components/dashboard/SearchInput";
import FilterSelect from "../../components/dashboard/FilterSelect";
import DataTable from "../../components/dashboard/DataTable";
import StatusBadge from "../../components/dashboard/StatusBadge";
import Avatar from "../../components/dashboard/Avatar";
import ActionMenu from "../../components/dashboard/ActionMenu";
import Drawer from "../../components/layout/DashboardDrawer";
import ConfirmationDialog from "../../components/dashboard/ConfirmationDialog";
import UsersMobileCards from "../../components/super-admin/UsersMobileCards";
import Button from "../../components/ui/Button";
import { Skeleton, SkeletonText } from "../../components/common/Skeleton";
import { formatDate, formatDateTime } from "../../utils/formatters";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useUserStore } from "../../store/useUserStore";
import { getUserAvailableActions } from "../../utils/dashboardActions";
import { USER_ROLES } from "../../constants/roles.constants";

const TABLE_QUERY_LIMIT = 1000;

const roleOptions = [
  { value: "", label: "All roles" },
  { value: USER_ROLES.SUPER_ADMIN, label: "Super Admin" },
  { value: USER_ROLES.ADMIN, label: "Admin" },
  { value: USER_ROLES.MANAGER, label: "Manager" },
  { value: USER_ROLES.CUSTOMER, label: "Customer" },
];

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "PENDING_VERIFICATION", label: "Pending verification" },
];

function getDisplayName(user) {
  return `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unnamed user";
}

function buildUserActionItems(user, handlers) {
  const availableActions = getUserAvailableActions(user);
  const items = [];

  if (availableActions.includes("view")) {
    items.push({
      label: "View",
      icon: Eye,
      onClick: () => handlers.onView(user),
    });
  }

  if (availableActions.includes("suspend")) {
    items.push({
      label: "Suspend",
      icon: ShieldAlert,
      onClick: () => handlers.onSuspend(user),
    });
  }

  if (availableActions.includes("reactivate")) {
    items.push({
      label: "Reactivate",
      icon: RotateCcw,
      onClick: () => handlers.onReactivate(user),
    });
  }

  if (availableActions.includes("delete")) {
    items.push({
      label: "Soft delete",
      icon: ShieldOff,
      tone: "danger",
      onClick: () => handlers.onDelete(user),
    });
  }

  return items;
}

function UsersPage() {
  const users = useUserStore((state) => state.users);
  const selectedUser = useUserStore((state) => state.selectedUser);
  const query = useUserStore((state) => state.query);
  const isLoading = useUserStore((state) => state.isLoading);
  const isDetailLoading = useUserStore((state) => state.isDetailLoading);
  const isMutating = useUserStore((state) => state.isMutating);
  const error = useUserStore((state) => state.error);
  const detailError = useUserStore((state) => state.detailError);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const fetchUserById = useUserStore((state) => state.fetchUserById);
  const setSelectedUser = useUserStore((state) => state.setSelectedUser);
  const suspendUser = useUserStore((state) => state.suspendUser);
  const reactivateUser = useUserStore((state) => state.reactivateUser);
  const deleteUser = useUserStore((state) => state.deleteUser);

  const [searchValue, setSearchValue] = useState(query.search || "");
  const [activeDialog, setActiveDialog] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const didLoadRef = useRef(false);

  const debouncedSearch = useDebouncedValue(searchValue, 350);

  useEffect(() => {
    if (!didLoadRef.current && users.length === 0 && !isLoading) {
      didLoadRef.current = true;
      fetchUsers({
        page: 1,
        limit: TABLE_QUERY_LIMIT,
      }).catch(() => {});
    }
  }, [fetchUsers, isLoading, users.length]);

  useEffect(() => {
    if (debouncedSearch === query.search) {
      return;
    }

    fetchUsers({
      search: debouncedSearch,
      page: 1,
      limit: TABLE_QUERY_LIMIT,
    }).catch(() => {});
  }, [debouncedSearch, fetchUsers, query.search]);

  const columns = useMemo(
    () => [
      {
        key: "firstName",
        label: "Name",
        sortable: true,
        render: (user) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={getDisplayName(user)} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{getDisplayName(user)}</p>
              <p className="truncate text-xs text-slate-500">{user.organization?.organizationName || "No organization"}</p>
            </div>
          </div>
        ),
      },
      {
        key: "email",
        label: "Email",
        sortable: true,
        render: (user) => user.email,
      },
      {
        key: "role",
        label: "Role",
        sortable: true,
        render: (user) => user.role,
      },
      {
        key: "accountStatus",
        label: "Status",
        sortable: true,
        render: (user) => <StatusBadge status={user.accountStatus} />,
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (user) => formatDate(user.createdAt),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (user) => (
          <ActionMenu
            items={buildUserActionItems(user, {
              onView: handleViewUser,
              onSuspend: handleOpenSuspend,
              onReactivate: handleOpenReactivate,
              onDelete: handleOpenDelete,
            })}
          />
        ),
      },
    ],
    []
  );

  async function refreshUsers(overrides = {}) {
    await fetchUsers(overrides);
  }

  async function handleViewUser(user) {
    try {
      await fetchUserById(user._id);
      setDrawerOpen(true);
    } catch (error) {
      toast.error(error.message || "Unable to load user details");
    }
  }

  function handleOpenSuspend(user) {
    setSelectedUser(user);
    setActiveDialog({
      type: "suspend",
      user,
    });
  }

  function handleOpenReactivate(user) {
    setSelectedUser(user);
    setActiveDialog({
      type: "reactivate",
      user,
    });
  }

  function handleOpenDelete(user) {
    setSelectedUser(user);
    setActiveDialog({
      type: "delete",
      user,
    });
  }

  async function submitUserAction(reason) {
    const user = activeDialog?.user;

    if (!user) {
      return;
    }

    try {
      switch (activeDialog.type) {
        case "suspend":
          await suspendUser(user._id, { suspensionReason: reason });
          toast.success("User suspended successfully");
          break;
        case "reactivate":
          await reactivateUser(user._id);
          toast.success("User reactivated successfully");
          break;
        case "delete":
          await deleteUser(user._id);
          toast.success("User deleted successfully");
          break;
        default:
          break;
      }

      setActiveDialog(null);
      setDrawerOpen(false);
      await refreshUsers();
    } catch (error) {
      toast.error(error.message || "Action failed");
    }
  }

  if (error && users.length === 0) {
    return (
      <ErrorState
        title="Users unavailable"
        message={error}
        onRetry={() =>
          fetchUsers({
            page: 1,
            limit: TABLE_QUERY_LIMIT,
          }).catch(() => {})
        }
      />
    );
  }

  const currentUser = selectedUser;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="User administration"
        title="Users"
        description="Search platform users, filter by role or status, and manage access from a single table."
        actions={[
          {
            label: "Refresh",
            variant: "secondary",
            onClick: () =>
              fetchUsers({
                page: 1,
                limit: TABLE_QUERY_LIMIT,
              }).catch(() => {}),
            isLoading,
          },
        ]}
      />

      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="grid gap-4 xl:grid-cols-3">
          <SearchInput value={searchValue} onChange={(event) => setSearchValue(event.target.value)} />
          <FilterSelect
            label="Role filter"
            value={query.role || ""}
            onChange={(event) =>
              fetchUsers({
                role: event.target.value,
                page: 1,
                limit: TABLE_QUERY_LIMIT,
              }).catch(() => {})
            }
            options={roleOptions}
          />
          <FilterSelect
            label="Status filter"
            value={query.status || ""}
            onChange={(event) =>
              fetchUsers({
                status: event.target.value,
                page: 1,
                limit: TABLE_QUERY_LIMIT,
              }).catch(() => {})
            }
            options={statusOptions}
          />
        </div>
      </Card>

      <div className="hidden md:block">
        <div className="max-h-[36rem] overflow-auto rounded-3xl border border-slate-800/70">
          <DataTable
            columns={columns}
            data={users}
            isLoading={isLoading}
            sortBy={query.sortBy}
            sortOrder={query.sortOrder}
            onSort={(columnKey) => {
              const nextSortOrder = query.sortBy === columnKey && query.sortOrder === "asc" ? "desc" : "asc";

              fetchUsers({
                sortBy: columnKey,
                sortOrder: nextSortOrder,
                page: 1,
                limit: TABLE_QUERY_LIMIT,
              }).catch(() => {});
            }}
            emptyState={
              <EmptyState title="No users found" message="Try adjusting your search or filters to find more users." />
            }
          />
        </div>
      </div>

      <UsersMobileCards
        users={users}
        isLoading={isLoading}
        onView={handleViewUser}
        onSuspend={handleOpenSuspend}
        onReactivate={handleOpenReactivate}
        onDelete={handleOpenDelete}
        emptyState={<EmptyState title="No users found" message="Try adjusting your search or filters to find more users." />}
      />

      <Drawer
        open={drawerOpen}
        title={currentUser ? getDisplayName(currentUser) : "User details"}
        subtitle={currentUser?.email || "User profile summary"}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedUser(null);
        }}
        footer={
          <div className="flex flex-wrap gap-2">
            {currentUser ? (
              <>
                {getUserAvailableActions(currentUser).includes("suspend") ? (
                  <Button variant="secondary" onClick={() => handleOpenSuspend(currentUser)} isLoading={isMutating}>
                    Suspend
                  </Button>
                ) : null}
                {getUserAvailableActions(currentUser).includes("reactivate") ? (
                  <Button variant="secondary" onClick={() => handleOpenReactivate(currentUser)} isLoading={isMutating}>
                    Reactivate
                  </Button>
                ) : null}
                {getUserAvailableActions(currentUser).includes("delete") ? (
                  <Button variant="secondary" onClick={() => handleOpenDelete(currentUser)} isLoading={isMutating}>
                    Soft delete
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        }
      >
        {isDetailLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <SkeletonText className="h-4 w-40" />
                <SkeletonText className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : detailError ? (
          <ErrorState title="Unable to load details" message={detailError} onRetry={() => handleViewUser(selectedUser)} />
        ) : currentUser ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={getDisplayName(currentUser)} size="lg" />
              <div>
                <p className="text-lg font-semibold text-white">{getDisplayName(currentUser)}</p>
                <p className="text-sm text-slate-400">{currentUser.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={currentUser.accountStatus} />
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">{currentUser.role}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Organization" value={currentUser.organization?.organizationName || "No organization"} />
              <DetailField label="Created" value={formatDateTime(currentUser.createdAt)} />
              <DetailField label="Last login" value={formatDateTime(currentUser.lastLoginAt)} />
              <DetailField label="Email verified" value={currentUser.isEmailVerified ? "Yes" : "No"} />
            </div>
          </div>
        ) : null}
      </Drawer>

      <ConfirmationDialog
        open={Boolean(activeDialog)}
        title={
          activeDialog?.type === "suspend"
            ? "Suspend user"
            : activeDialog?.type === "reactivate"
            ? "Reactivate user"
            : "Soft delete user"
        }
        message={
          activeDialog?.type === "suspend"
            ? "Suspended users will not be able to access their account until reactivated."
            : activeDialog?.type === "reactivate"
            ? "Restore access for this user."
            : "This will mark the user as deleted without removing audit history."
        }
        confirmText={activeDialog?.type === "suspend" ? "Suspend" : activeDialog?.type === "reactivate" ? "Reactivate" : "Delete"}
        tone={activeDialog?.type === "reactivate" ? "primary" : "danger"}
        requiresReason={activeDialog?.type === "suspend"}
        reasonLabel="Suspension reason"
        reasonPlaceholder="Tell the user why the account is being suspended..."
        isLoading={isMutating}
        onCancel={() => setActiveDialog(null)}
        onConfirm={submitUserAction}
      />
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-200">{value}</p>
    </div>
  );
}

export default UsersPage;
