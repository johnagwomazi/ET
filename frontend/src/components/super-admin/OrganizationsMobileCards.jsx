import { useState } from "react";
import { Check, Eye, RotateCcw, ShieldAlert, ShieldOff, X } from "lucide-react";
import Card from "../ui/Card";
import Avatar from "../dashboard/Avatar";
import StatusBadge from "../dashboard/StatusBadge";
import Button from "../ui/Button";
import MobileActionSheet from "../dashboard/MobileActionSheet";
import { Skeleton, SkeletonText } from "../common/Skeleton";
import { formatDate } from "../../utils/formatters";
import { getOrganizationAvailableActions } from "../../utils/dashboardActions";

function buildOrganizationActionItems(organization, handlers) {
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

function getOrganizationName(organization) {
  return organization?.organizationName || "Unnamed organization";
}

function Field({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-200">{value}</p>
    </div>
  );
}

function OrganizationsMobileCards({
  organizations = [],
  isLoading = false,
  onView,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
  onDelete,
  emptyState,
}) {
  const [activeOrganization, setActiveOrganization] = useState(null);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`organizations-mobile-skeleton-${index}`} className="border-slate-800/70 bg-slate-950/85 p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <div className="space-y-2">
                  <SkeletonText className="h-4 w-40" />
                  <SkeletonText className="h-3 w-28" />
                </div>
              </div>
              <div className="grid gap-3">
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!organizations.length) {
    return <div className="md:hidden">{emptyState}</div>;
  }

  const activeActionItems = activeOrganization
    ? buildOrganizationActionItems(activeOrganization, {
        onView,
        onApprove,
        onReject,
        onSuspend,
        onReactivate,
        onDelete,
      })
    : [];

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {organizations.map((organization) => (
          <Card key={organization._id} className="border-slate-800/70 bg-slate-950/85 p-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={getOrganizationName(organization)} src={organization.logo?.url} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white">{getOrganizationName(organization)}</p>
                    <p className="truncate text-sm text-slate-400">{organization.website || "Website not provided"}</p>
                  </div>
                </div>
                <StatusBadge status={organization.status} />
              </div>

              <div className="grid gap-3">
                <Field
                  label="Admin"
                  value={
                    organization.primaryAdmin
                      ? `${organization.primaryAdmin.firstName} ${organization.primaryAdmin.lastName}`
                      : "Unassigned"
                  }
                />
                <Field label="Business Email" value={organization.businessEmail} />
                <Field label="Created Date" value={formatDate(organization.createdAt)} />
              </div>

              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setActiveOrganization(organization)}>
                  Actions
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <MobileActionSheet
        open={Boolean(activeOrganization)}
        title="Actions"
        description={activeOrganization ? getOrganizationName(activeOrganization) : undefined}
        items={activeActionItems}
        onClose={() => setActiveOrganization(null)}
      />
    </>
  );
}

export default OrganizationsMobileCards;
