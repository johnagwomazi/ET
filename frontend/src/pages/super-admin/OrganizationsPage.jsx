import { useEffect, useMemo, useRef, useState } from "react";
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
import OrganizationsMobileCards from "../../components/super-admin/OrganizationsMobileCards";
import Button from "../../components/ui/Button";
import { Skeleton, SkeletonText } from "../../components/common/Skeleton";
import { formatDate, formatDateTime } from "../../utils/formatters";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ORGANIZATION_STATUS_META } from "../../constants/dashboard.constants";
import { useOrganizationStore } from "../../store/useOrganizationStore";
import { getOrganizationAvailableActions } from "../../utils/dashboardActions";
import { Building2, Check, Clock3, Eye, RotateCcw, ShieldAlert, ShieldOff, X } from "lucide-react";

const TABLE_QUERY_LIMIT = 1000;

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: ORGANIZATION_STATUS_META.PENDING.label },
  { value: "APPROVED", label: ORGANIZATION_STATUS_META.APPROVED.label },
  { value: "REJECTED", label: ORGANIZATION_STATUS_META.REJECTED.label },
  { value: "SUSPENDED", label: ORGANIZATION_STATUS_META.SUSPENDED.label },
];

function getOrganizationName(organization) {
  return organization?.organizationName || "Unnamed organization";
}

function buildActionItems(organization, handlers) {
  const availableActions = getOrganizationAvailableActions(organization);
  const items = [];

  if (availableActions.includes("view")) {
    items.push({
      label: "View",
      icon: Eye,
      onClick: () => handlers.onView(organization),
    });
  }

  if (availableActions.includes("approve")) {
    items.push({
      label: "Approve",
      icon: Check,
      onClick: () => handlers.onApprove(organization),
    });
  }

  if (availableActions.includes("reject")) {
    items.push({
      label: "Reject",
      icon: X,
      tone: "danger",
      onClick: () => handlers.onReject(organization),
    });
  }

  if (availableActions.includes("suspend")) {
    items.push({
      label: "Suspend",
      icon: ShieldAlert,
      onClick: () => handlers.onSuspend(organization),
    });
  }

  if (availableActions.includes("reactivate")) {
    items.push({
      label: "Reactivate",
      icon: RotateCcw,
      onClick: () => handlers.onReactivate(organization),
    });
  }

  if (availableActions.includes("delete")) {
    items.push({
      label: "Delete",
      icon: ShieldOff,
      tone: "danger",
      onClick: () => handlers.onDelete(organization),
    });
  }

  return items;
}

function OrganizationsPage() {
  const organizations = useOrganizationStore((state) => state.organizations);
  const selectedOrganization = useOrganizationStore((state) => state.selectedOrganization);
  const query = useOrganizationStore((state) => state.query);
  const isLoading = useOrganizationStore((state) => state.isLoading);
  const isDetailLoading = useOrganizationStore((state) => state.isDetailLoading);
  const isMutating = useOrganizationStore((state) => state.isMutating);
  const error = useOrganizationStore((state) => state.error);
  const detailError = useOrganizationStore((state) => state.detailError);
  const fetchOrganizations = useOrganizationStore((state) => state.fetchOrganizations);
  const fetchOrganizationById = useOrganizationStore((state) => state.fetchOrganizationById);
  const setSelectedOrganization = useOrganizationStore((state) => state.setSelectedOrganization);
  const approveOrganization = useOrganizationStore((state) => state.approveOrganization);
  const rejectOrganization = useOrganizationStore((state) => state.rejectOrganization);
  const suspendOrganization = useOrganizationStore((state) => state.suspendOrganization);
  const reactivateOrganization = useOrganizationStore((state) => state.reactivateOrganization);
  const deleteOrganization = useOrganizationStore((state) => state.deleteOrganization);

  const [searchValue, setSearchValue] = useState(query.search || "");
  const [activeDialog, setActiveDialog] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const didLoadRef = useRef(false);

  const debouncedSearch = useDebouncedValue(searchValue, 350);

  useEffect(() => {
    if (!didLoadRef.current && organizations.length === 0 && !isLoading) {
      didLoadRef.current = true;
      fetchOrganizations({
        page: 1,
        limit: TABLE_QUERY_LIMIT,
      }).catch(() => {});
    }
  }, [fetchOrganizations, isLoading, organizations.length]);

  useEffect(() => {
    if (debouncedSearch === query.search) {
      return;
    }

    fetchOrganizations({
      search: debouncedSearch,
      page: 1,
      limit: TABLE_QUERY_LIMIT,
    }).catch(() => {});
  }, [debouncedSearch, fetchOrganizations, query.search]);

  const columns = useMemo(
    () => [
      {
        key: "organizationName",
        label: "Organization",
        sortable: true,
        render: (organization) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={organization.organizationName} src={organization.logo?.url} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{organization.organizationName}</p>
              <p className="truncate text-xs text-slate-500">{organization.website || "Website not provided"}</p>
            </div>
          </div>
        ),
      },
      {
        key: "primaryAdmin",
        label: "Admin",
        sortable: false,
        render: (organization) => {
          const admin = organization.primaryAdmin;

          return admin ? `${admin.firstName} ${admin.lastName}` : "Unassigned";
        },
      },
      {
        key: "businessEmail",
        label: "Business Email",
        sortable: true,
        render: (organization) => organization.businessEmail,
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (organization) => <StatusBadge status={organization.status} />,
      },
      {
        key: "createdAt",
        label: "Created Date",
        sortable: true,
        render: (organization) => formatDate(organization.createdAt),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (organization) => (
          <ActionMenu
            items={buildActionItems(organization, {
              onView: handleViewOrganization,
              onApprove: handleOpenApprove,
              onReject: handleOpenReject,
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

  async function refreshOrganizations(overrides = {}) {
    await fetchOrganizations(overrides);
  }

  async function handleViewOrganization(organization) {
    try {
      await fetchOrganizationById(organization._id);
      setDrawerOpen(true);
    } catch (error) {
      toast.error(error.message || "Unable to load organization details");
    }
  }

  function handleOpenApprove(organization) {
    setSelectedOrganization(organization);
    setActiveDialog({
      type: "approve",
      organization,
    });
  }

  function handleOpenReject(organization) {
    setSelectedOrganization(organization);
    setActiveDialog({
      type: "reject",
      organization,
    });
  }

  function handleOpenSuspend(organization) {
    setSelectedOrganization(organization);
    setActiveDialog({
      type: "suspend",
      organization,
    });
  }

  function handleOpenReactivate(organization) {
    setSelectedOrganization(organization);
    setActiveDialog({
      type: "reactivate",
      organization,
    });
  }

  function handleOpenDelete(organization) {
    setSelectedOrganization(organization);
    setActiveDialog({
      type: "delete",
      organization,
    });
  }

  async function submitOrganizationAction(reason) {
    const organization = activeDialog?.organization;

    if (!organization) {
      return;
    }

    try {
      switch (activeDialog.type) {
        case "approve":
          await approveOrganization(organization._id);
          toast.success("Organization approved successfully");
          break;
        case "reject":
          await rejectOrganization(organization._id, { rejectionReason: reason });
          toast.success("Organization rejected successfully");
          break;
        case "suspend":
          await suspendOrganization(organization._id, { suspensionReason: reason });
          toast.success("Organization suspended successfully");
          break;
        case "reactivate":
          await reactivateOrganization(organization._id);
          toast.success("Organization reactivated successfully");
          break;
        case "delete":
          await deleteOrganization(organization._id);
          toast.success("Organization deleted successfully");
          break;
        default:
          break;
      }

      setActiveDialog(null);
      setDrawerOpen(false);
      await refreshOrganizations();
    } catch (error) {
      toast.error(error.message || "Action failed");
    }
  }

  function closeDialog() {
    setActiveDialog(null);
  }

  const drawerOrganization = selectedOrganization || null;
  const currentOrganization = selectedOrganization || drawerOrganization;

  if (error && organizations.length === 0) {
    return (
      <ErrorState
        title="Organizations unavailable"
        message={error}
        onRetry={() =>
          fetchOrganizations({
            page: 1,
            limit: TABLE_QUERY_LIMIT,
          }).catch(() => {})
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Organization review"
        title="Organizations"
        description="Search, filter, and review organization applications from a single management table."
        actions={[
          {
            label: "Refresh",
            variant: "secondary",
            onClick: () =>
              fetchOrganizations({
                page: 1,
                limit: TABLE_QUERY_LIMIT,
              }).catch(() => {}),
            isLoading,
          },
        ]}
      />

      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="grid gap-4 md:grid-cols-3">
          <SearchInput value={searchValue} onChange={(event) => setSearchValue(event.target.value)} />
          <FilterSelect
            label="Status filter"
            value={query.status || ""}
            onChange={(event) =>
              fetchOrganizations({
                status: event.target.value,
                page: 1,
                limit: TABLE_QUERY_LIMIT,
              }).catch(() => {})
            }
            options={statusOptions}
          />
          <div className="flex items-end">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
              {formatDateTime(new Date())}
            </div>
          </div>
        </div>
      </Card>

      <div className="hidden md:block">
        <div className="max-h-[36rem] overflow-auto rounded-3xl border border-slate-800/70">
          <DataTable
            columns={columns}
            data={organizations}
            isLoading={isLoading}
            sortBy={query.sortBy}
            sortOrder={query.sortOrder}
            onSort={(columnKey) => {
              const nextSortOrder = query.sortBy === columnKey && query.sortOrder === "asc" ? "desc" : "asc";

              fetchOrganizations({
                sortBy: columnKey,
                sortOrder: nextSortOrder,
                page: 1,
                limit: TABLE_QUERY_LIMIT,
              }).catch(() => {});
            }}
            emptyState={
              <EmptyState
                title="No organizations found"
                message="Try a different search term or reset the filters to see more results."
              />
            }
          />
        </div>
      </div>

      <OrganizationsMobileCards
        organizations={organizations}
        isLoading={isLoading}
        onView={handleViewOrganization}
        onApprove={handleOpenApprove}
        onReject={handleOpenReject}
        onSuspend={handleOpenSuspend}
        onReactivate={handleOpenReactivate}
        onDelete={handleOpenDelete}
        emptyState={
          <EmptyState
            title="No organizations found"
            message="Try a different search term or reset the filters to see more results."
          />
        }
      />

      <Drawer
        open={drawerOpen}
        title={currentOrganization ? currentOrganization.organizationName : "Organization details"}
        subtitle={currentOrganization?.businessEmail || "Organization review summary"}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedOrganization(null);
        }}
        footer={
          <div className="flex flex-wrap gap-2">
            {currentOrganization ? (
              <>
                {getOrganizationAvailableActions(currentOrganization).includes("approve") ? (
                  <Button onClick={() => handleOpenApprove(currentOrganization)} isLoading={isMutating}>
                    Approve
                  </Button>
                ) : null}
                {getOrganizationAvailableActions(currentOrganization).includes("reject") ? (
                  <Button variant="secondary" onClick={() => handleOpenReject(currentOrganization)} isLoading={isMutating}>
                    Reject
                  </Button>
                ) : null}
                {getOrganizationAvailableActions(currentOrganization).includes("suspend") ? (
                  <Button variant="secondary" onClick={() => handleOpenSuspend(currentOrganization)} isLoading={isMutating}>
                    Suspend
                  </Button>
                ) : null}
                {getOrganizationAvailableActions(currentOrganization).includes("reactivate") ? (
                  <Button variant="secondary" onClick={() => handleOpenReactivate(currentOrganization)} isLoading={isMutating}>
                    Reactivate
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
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <div className="space-y-2">
                <SkeletonText className="h-4 w-40" />
                <SkeletonText className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : detailError ? (
          <ErrorState title="Unable to load details" message={detailError} onRetry={() => handleViewOrganization(selectedOrganization)} />
        ) : currentOrganization ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={currentOrganization.organizationName} src={currentOrganization.logo?.url} size="lg" />
              <div>
                <p className="text-lg font-semibold text-white">{currentOrganization.organizationName}</p>
                <p className="text-sm text-slate-400">{currentOrganization.businessEmail}</p>
                <div className="mt-2">
                  <StatusBadge status={currentOrganization.status} />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Admin" value={currentOrganization.primaryAdmin ? `${currentOrganization.primaryAdmin.firstName} ${currentOrganization.primaryAdmin.lastName}` : "Unassigned"} />
              <DetailField label="Phone" value={currentOrganization.businessPhone || "Not provided"} />
              <DetailField label="Website" value={currentOrganization.website || "Placeholder"} />
              <DetailField label="Address" value={currentOrganization.address || "Placeholder"} />
            </div>

            <Card className="border-slate-800/70 bg-slate-950/70 p-4">
              <p className="text-sm font-semibold text-white">Approval History</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <HistoryItem label="Approved at" value={formatDateTime(currentOrganization.approvedAt)} />
                <HistoryItem label="Rejected at" value={formatDateTime(currentOrganization.rejectedAt)} />
                <HistoryItem label="Suspended at" value={formatDateTime(currentOrganization.suspendedAt)} />
                <HistoryItem label="Reactivated at" value={formatDateTime(currentOrganization.reactivatedAt)} />
              </div>
            </Card>
          </div>
        ) : null}
      </Drawer>

      <ConfirmationDialog
        open={Boolean(activeDialog)}
        title={
          activeDialog?.type === "approve"
            ? "Approve organization"
            : activeDialog?.type === "reject"
            ? "Reject organization"
            : activeDialog?.type === "suspend"
            ? "Suspend organization"
            : activeDialog?.type === "reactivate"
            ? "Reactivate organization"
            : "Delete organization"
        }
        message={
          activeDialog?.type === "approve"
            ? "This will move the organization into the approved state."
            : activeDialog?.type === "reject"
            ? "Provide a reason so the organization knows what needs to be addressed."
            : activeDialog?.type === "suspend"
            ? "Suspended organizations cannot access the platform until they are reactivated."
            : activeDialog?.type === "reactivate"
            ? "Reactivate this organization and restore access."
            : "This will permanently mark the organization as deleted."
        }
        confirmText={
          activeDialog?.type === "approve"
            ? "Approve"
            : activeDialog?.type === "reject"
            ? "Reject"
            : activeDialog?.type === "suspend"
            ? "Suspend"
            : activeDialog?.type === "reactivate"
            ? "Reactivate"
            : "Delete"
        }
        tone={activeDialog?.type === "approve" || activeDialog?.type === "reactivate" ? "primary" : "danger"}
        requiresReason={activeDialog?.type === "reject" || activeDialog?.type === "suspend"}
        reasonLabel="Reason"
        reasonPlaceholder="Tell the organization why this decision was made..."
        isLoading={isMutating}
        onCancel={closeDialog}
        onConfirm={submitOrganizationAction}
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

function HistoryItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-200">{value}</p>
    </div>
  );
}

export default OrganizationsPage;
