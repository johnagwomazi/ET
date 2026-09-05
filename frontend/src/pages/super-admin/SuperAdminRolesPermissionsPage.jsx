import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ShieldCheck } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/common/EmptyState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import { ROUTE_PATHS } from "../../routes/routePaths";
import {
  ORGANIZATION_ROLE_ORDER,
  getGroupedOrganizationPermissions,
  getOrganizationPermissionLabel,
  getOrganizationRoleDefinition,
  getOrganizationRoleDescription,
  getOrganizationRoleLabel,
  getOrganizationRolePermissions,
} from "../../constants/organizationRoles.constants";
import { formatNumber } from "../../utils/formatters";

function PermissionChip({ checked, label }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
        checked ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20" : "bg-slate-800 text-slate-300",
      ].join(" ")}
    >
      <Check className="h-3.5 w-3.5" />
      <span>{label}</span>
    </span>
  );
}

function SuperAdminRolesPermissionsPage() {
  const navigate = useNavigate();

  const roleDefinitions = useMemo(
    () => ORGANIZATION_ROLE_ORDER.map((role) => getOrganizationRoleDefinition(role)).filter(Boolean),
    []
  );
  const groupedPermissions = useMemo(() => getGroupedOrganizationPermissions(), []);
  const [selectedRoleKey, setSelectedRoleKey] = useState(roleDefinitions[0]?.key || null);
  const [mobileRoleKey, setMobileRoleKey] = useState(null);

  useEffect(() => {
    if (roleDefinitions.length === 0) {
      return;
    }

    if (selectedRoleKey && roleDefinitions.some((role) => role.key === selectedRoleKey)) {
      return;
    }

    setSelectedRoleKey(roleDefinitions[0].key);
  }, [roleDefinitions, selectedRoleKey]);

  if (roleDefinitions.length === 0) {
    return <EmptyState title="No roles available" message="No organization roles are currently available." />;
  }

  const selectedRole = roleDefinitions.find((role) => role.key === selectedRoleKey) || roleDefinitions[0];
  const selectedRolePermissions = getOrganizationRolePermissions(selectedRole.key);
  const mobileRole = roleDefinitions.find((role) => role.key === mobileRoleKey) || null;
  const mobileRolePermissions = mobileRole ? getOrganizationRolePermissions(mobileRole.key) : [];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Access control"
        title="Roles & Permissions"
        description="Review the permissions assigned to each organization role."
        actions={[
          {
            label: "Users",
            variant: "secondary",
            onClick: () => navigate(ROUTE_PATHS.SUPER_ADMIN_USERS),
          },
          {
            label: "Organizations",
            variant: "secondary",
            onClick: () => navigate(ROUTE_PATHS.SUPER_ADMIN_ORGANIZATIONS),
          },
        ]}
      />

      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span className="rounded-full bg-app-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-app-200">
            System roles only
          </span>
          <span className="text-slate-400">
            Organization roles and permissions are read only.
          </span>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <Card className="border-slate-800/70 bg-slate-950/85 p-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Roles</p>
              <p className="mt-1 text-sm text-slate-400">{formatNumber(roleDefinitions.length)} available roles</p>
            </div>

            <div className="grid gap-3">
              {roleDefinitions.map((role) => {
                const isSelected = role.key === selectedRole.key;

                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRoleKey(role.key)}
                    className={[
                      "rounded-2xl border p-4 text-left transition",
                      isSelected
                        ? "border-app-500/40 bg-app-500/10 shadow-soft"
                        : "border-slate-800 bg-slate-950/60 hover:border-app-500/20 hover:bg-slate-900/80",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{getOrganizationRoleLabel(role.key)}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{getOrganizationRoleDescription(role.key)}</p>
                      </div>

                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                        System
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <span>{formatNumber(role.permissions.length)} permissions</span>
                      <span>{role.key}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-800/70 bg-slate-950/85 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold text-white">{getOrganizationRoleLabel(selectedRole.key)}</h3>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    System role
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-400">{getOrganizationRoleDescription(selectedRole.key)}</p>
                <p className="text-sm text-slate-500">
                  These roles are also available when assigning access from the Members page.
                </p>
              </div>

              <div className="grid gap-2 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Permissions</p>
                <p className="text-2xl font-semibold text-white">{formatNumber(selectedRolePermissions.length)}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {groupedPermissions.map((group) => (
                <div key={group.group} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{group.group}</p>
                  <div className="mt-3 grid gap-2">
                    {group.permissions.map((permission) => {
                      const allowed = selectedRolePermissions.includes(permission);

                      return (
                        <div
                          key={permission}
                          className={[
                            "flex items-center justify-between rounded-xl border px-3 py-2 text-sm",
                            allowed
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                              : "border-slate-800 bg-slate-950/80 text-slate-300",
                          ].join(" ")}
                        >
                          <span>{getOrganizationPermissionLabel(permission)}</span>
                          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            {allowed ? "Allowed" : "Not allowed"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-slate-800/70 bg-slate-950/85 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Role matrix</p>
                <p className="mt-1 text-sm text-slate-400">Compare permissions across the available organization roles.</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-3 py-2">Permission</th>
                    {roleDefinitions.map((role) => (
                      <th key={role.key} className="px-3 py-2">
                        {getOrganizationRoleLabel(role.key)}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {groupedPermissions.map((group) => (
                    <Fragment key={group.group}>
                      <tr>
                        <th
                          colSpan={roleDefinitions.length + 1}
                          className="px-3 pt-4 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                        >
                          {group.group}
                        </th>
                      </tr>

                      {group.permissions.map((permission) => (
                        <tr key={permission} className="text-sm">
                          <td className="rounded-l-2xl border border-slate-800 bg-slate-950/80 px-3 py-3 text-slate-200">
                            {getOrganizationPermissionLabel(permission)}
                          </td>

                          {roleDefinitions.map((role, roleIndex) => {
                            const allowed = getOrganizationRolePermissions(role.key).includes(permission);

                            return (
                              <td
                                key={role.key}
                                className={[
                                  "border-y border-slate-800 px-3 py-3 text-center",
                                  roleIndex === roleDefinitions.length - 1 ? "rounded-r-2xl border-r" : "",
                                  allowed ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-950/80 text-slate-500",
                                ].join(" ")}
                              >
                                {allowed ? (
                                  <span className="inline-flex items-center gap-2">
                                    <Check className="h-4 w-4" />
                                    <span className="sr-only">Allowed</span>
                                  </span>
                                ) : (
                                  <span className="text-sm">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:hidden">
        {roleDefinitions.map((role) => (
          <Card key={role.key} className="border-slate-800/70 bg-slate-950/85 p-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{getOrganizationRoleLabel(role.key)}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{getOrganizationRoleDescription(role.key)}</p>
                </div>

                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  System
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{formatNumber(role.permissions.length)} permissions</span>
                <span>{role.key}</span>
              </div>

              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setMobileRoleKey(role.key)}>
                  View permissions
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(mobileRole)}
        title={mobileRole ? getOrganizationRoleLabel(mobileRole.key) : "Role permissions"}
        onClose={() => setMobileRoleKey(null)}
        className="max-w-2xl"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setMobileRoleKey(null)}>
              Close
            </Button>
          </div>
        }
      >
        {mobileRole ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">{getOrganizationRoleLabel(mobileRole.key)}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{getOrganizationRoleDescription(mobileRole.key)}</p>
              </div>

              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                System role
              </span>
            </div>

            <div className="grid gap-3">
              {groupedPermissions.map((group) => (
                <div key={group.group} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{group.group}</p>
                  <div className="mt-3 grid gap-2">
                    {group.permissions.map((permission) => {
                      const allowed = mobileRolePermissions.includes(permission);

                      return <PermissionChip key={permission} checked={allowed} label={getOrganizationPermissionLabel(permission)} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default SuperAdminRolesPermissionsPage;
