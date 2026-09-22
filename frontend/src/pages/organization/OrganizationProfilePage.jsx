import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Building2, ImageIcon } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import FormField from "../../components/forms/FormField";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import Avatar from "../../components/dashboard/Avatar";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { OrganizationProfileSkeleton } from "../../components/organization/OrganizationLoadingStates";
import { useOrganizationContextStore } from "../../store/useOrganizationContextStore";
import { useOrganizationPermissions } from "../../hooks/useOrganizationPermissions";
import { ORGANIZATION_PERMISSIONS } from "../../constants/organizationPermissions.constants";
import * as organizationService from "../../services/organization.service";
import { formatDateTime } from "../../utils/formatters";
import {
  buildOrganizationProfileForm,
  buildOrganizationProfilePayload,
  validateOrganizationProfileForm,
} from "../../utils/organizationFormUtils";

function getLogoAltText(organization) {
  return `${organization?.organizationName || "Organization"} logo`;
}

function OrganizationProfilePage() {
  const contextOrganization = useOrganizationContextStore((state) => state.organization);
  const refreshOrganizationContext = useOrganizationContextStore((state) => state.refreshOrganizationContext);
  const { hasPermission } = useOrganizationPermissions();
  const canView = hasPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_VIEW);
  const canEdit = hasPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE);

  const [organization, setOrganization] = useState(contextOrganization);
  const [formValues, setFormValues] = useState(() => buildOrganizationProfileForm(contextOrganization));
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setOrganization(contextOrganization);
    setFormValues(buildOrganizationProfileForm(contextOrganization));
  }, [contextOrganization]);

  const summaryCards = useMemo(() => {
    if (!organization) {
      return [];
    }

    return [
      {
        label: "Status",
        value: <StatusBadge status={organization.status} />,
      },
      {
        label: "Primary admin",
        value: organization.primaryAdmin
          ? `${organization.primaryAdmin.firstName || ""} ${organization.primaryAdmin.lastName || ""}`.trim()
          : "Unassigned",
      },
      {
        label: "Created",
        value: formatDateTime(organization.createdAt),
      },
      {
        label: "Updated",
        value: formatDateTime(organization.updatedAt),
      },
    ];
  }, [organization]);

  async function loadOrganization() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await organizationService.getMyOrganization();
      const nextOrganization = response?.organization || null;

      setOrganization(nextOrganization);
      setFormValues(buildOrganizationProfileForm(nextOrganization));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrganization();
  }, []);

  function updateField(field, value) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    const nextErrors = validateOrganizationProfileForm(formValues);

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = buildOrganizationProfilePayload(formValues);
      const response = await organizationService.updateMyOrganization(payload);
      const nextOrganization = response?.organization || null;

      if (nextOrganization) {
        setOrganization(nextOrganization);
        setFormValues(buildOrganizationProfileForm(nextOrganization));
      }

      await refreshOrganizationContext();
      toast.success("Organization profile updated successfully");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Something went wrong");
      toast.error(saveError instanceof Error ? saveError.message : "Unable to update organization profile");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading && !organization) {
    return <OrganizationProfileSkeleton />;
  }

  if (error && !organization) {
    return <ErrorState title="Unable to load organization" message={error} onRetry={loadOrganization} />;
  }

  if (!canView && !organization) {
    return <ErrorState title="Organization unavailable" message="You do not have permission to view this organization." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionHeader
        eyebrow="Organization management"
        title="Organization Profile"
        description="View and update your organization's core business information."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800/70 pb-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Organization information</p>
              <p className="text-sm text-slate-400">Update the public details attached to this organization.</p>
            </div>
            {!canEdit ? (
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                View only
              </span>
            ) : null}
          </div>

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <fieldset disabled={!canEdit || isSaving}>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Organization name"
                  value={formValues.organizationName}
                  onChange={(event) => updateField("organizationName", event.target.value)}
                  error={fieldErrors.organizationName}
                  placeholder="Enter organization name"
                />
                <Input
                  label="Business email"
                  type="email"
                  value={formValues.businessEmail}
                  onChange={(event) => updateField("businessEmail", event.target.value)}
                  error={fieldErrors.businessEmail}
                  placeholder="business@example.com"
                />
                <Input
                  label="Business phone"
                  value={formValues.businessPhone}
                  onChange={(event) => updateField("businessPhone", event.target.value)}
                  error={fieldErrors.businessPhone}
                  placeholder="+234..."
                />
                <Input
                  label="Website"
                  value={formValues.website}
                  onChange={(event) => updateField("website", event.target.value)}
                  error={fieldErrors.website}
                  placeholder="https://example.com"
                />
              </div>

              <FormField label="Address" error={fieldErrors.address}>
                <textarea
                  value={formValues.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  rows={4}
                  placeholder="Organization address"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-app-500 focus:ring-2 focus:ring-app-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </FormField>
            </fieldset>
          </form>

          {canEdit ? (
            <div className="mt-6 flex justify-end border-t border-slate-800/70 pt-4">
              <Button onClick={handleSubmit} isLoading={isSaving} loadingText="Saving...">
                Save Changes
              </Button>
            </div>
          ) : null}
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-800/70 bg-slate-950/85">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {organization?.logo?.url ? (
                    <img
                      src={organization.logo.url}
                      alt={getLogoAltText(organization)}
                      className="h-20 w-20 rounded-2xl border border-slate-800 object-cover"
                    />
                  ) : (
                    <Avatar name={organization?.organizationName} size="lg" className="h-20 w-20" />
                  )}
                  <span className="absolute -bottom-2 -right-2 rounded-full bg-slate-950 p-1 text-slate-400 ring-1 ring-slate-800">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-white">{organization?.organizationName || "Organization"}</h3>
                  <p className="truncate text-sm text-slate-400">{organization?.businessEmail || "No business email"}</p>
                  <div className="mt-2">
                    <StatusBadge status={organization?.status} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {summaryCards.map((card) => (
                  <div key={card.label} className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 sm:rounded-2xl sm:p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
                    <div className="mt-2 text-sm text-slate-200">{card.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="border-slate-800/70 bg-slate-950/85">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-app-300" />
                <h3 className="text-base font-semibold text-white">Logo and media</h3>
              </div>
              <p className="text-sm leading-6 text-slate-400">
                Review the logo currently associated with this organization.
              </p>
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                {organization?.logo?.url ? "Current logo is displayed above." : "No logo has been configured yet."}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default OrganizationProfilePage;
