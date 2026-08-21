import { useState } from "react";
import Card from "../ui/Card";
import Avatar from "../dashboard/Avatar";
import StatusBadge from "../dashboard/StatusBadge";
import Button from "../ui/Button";
import MobileActionSheet from "../dashboard/MobileActionSheet";
import { Skeleton, SkeletonText } from "../common/Skeleton";
import { formatDate } from "../../utils/formatters";
import {
  buildOrganizationMemberActionItems,
  getOrganizationMemberDisplayName,
} from "../../utils/organizationMemberActions";
import { getOrganizationRoleLabel } from "../../constants/organizationRoles.constants";

function Field({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-200">{value}</p>
    </div>
  );
}

function OrganizationMembersMobileCards({
  members = [],
  isLoading = false,
  onChangeRole,
  onRemove,
  canUpdateRole = false,
  canRemoveMember = false,
  currentUserId,
  emptyState,
}) {
  const [activeMember, setActiveMember] = useState(null);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`members-mobile-skeleton-${index}`} className="border-slate-800/70 bg-slate-950/85 p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <SkeletonText className="h-4 w-36" />
                  <SkeletonText className="h-3 w-28" />
                </div>
              </div>
              <div className="grid gap-3">
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!members.length) {
    return <div className="md:hidden">{emptyState}</div>;
  }

  const activeActionItems = activeMember
    ? buildOrganizationMemberActionItems(
        activeMember,
        {
          onChangeRole,
          onRemove,
        },
        {
          canUpdateRole,
          canRemoveMember,
        },
        currentUserId
      )
    : [];

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {members.map((member) => {
          return (
            <Card key={member.id} className="border-slate-800/70 bg-slate-950/85 p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={getOrganizationMemberDisplayName(member)} size="md" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-white">
                          {getOrganizationMemberDisplayName(member)}
                        </p>
                        {member.isPrimaryAdmin ? (
                          <span className="rounded-full bg-app-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-200">
                            Primary admin
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-sm text-slate-400">{member.email}</p>
                    </div>
                  </div>
                  <StatusBadge status={member.accountStatus} />
                </div>

                <div className="grid gap-3">
                  <Field label="Role" value={getOrganizationRoleLabel(member.role)} />
                  <Field label="Joined" value={formatDate(member.joinedAt)} />
                </div>

                <div className="flex justify-end">
                  <Button variant="secondary" onClick={() => setActiveMember(member)}>
                    Actions
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <MobileActionSheet
        open={Boolean(activeMember)}
        title="Member Actions"
        description={activeMember ? getOrganizationMemberDisplayName(activeMember) : undefined}
        items={activeActionItems}
        onClose={() => setActiveMember(null)}
      />
    </>
  );
}

export default OrganizationMembersMobileCards;
