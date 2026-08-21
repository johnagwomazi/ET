import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Globe, Facebook, Instagram, Linkedin, X } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import FormField from "../../components/forms/FormField";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import { OrganizationSettingsSkeleton } from "../../components/organization/OrganizationLoadingStates";
import { useOrganizationContextStore } from "../../store/useOrganizationContextStore";
import { useOrganizationPermissions } from "../../hooks/useOrganizationPermissions";
import { ORGANIZATION_PERMISSIONS } from "../../constants/organizationPermissions.constants";
import * as organizationService from "../../services/organization.service";
import { formatDateTime } from "../../utils/formatters";
import {
  buildOrganizationSettingsForm,
  buildOrganizationSettingsPayload,
  validateOrganizationSettingsForm,
} from "../../utils/organizationFormUtils";

const socialFields = [
  {
    key: "website",
    label: "Website",
    icon: Globe,
    placeholder: "https://example.com",
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: Facebook,
    placeholder: "https://facebook.com/your-page",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: Instagram,
    placeholder: "https://instagram.com/your-handle",
  },
  {
    key: "x",
    label: "X",
    icon: X,
    placeholder: "https://x.com/your-handle",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    placeholder: "https://linkedin.com/company/your-company",
  },
];

function OrganizationSettingsPage() {
  const contextOrganization = useOrganizationContextStore((state) => state.organization);
  const refreshOrganizationContext = useOrganizationContextStore((state) => state.refreshOrganizationContext);
  const { hasPermission } = useOrganizationPermissions();
  const canView = hasPermission(ORGANIZATION_PERMISSIONS.SETTINGS_VIEW);
  const canEdit = hasPermission(ORGANIZATION_PERMISSIONS.SETTINGS_UPDATE);

  const [organization, setOrganization] = useState(contextOrganization);
  const [formValues, setFormValues] = useState(() => buildOrganizationSettingsForm(contextOrganization));
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setOrganization(contextOrganization);
    setFormValues(buildOrganizationSettingsForm(contextOrganization));
  }, [contextOrganization]);

  const lastUpdated = useMemo(() => formatDateTime(organization?.updatedAt), [organization?.updatedAt]);

  async function loadSettings() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await organizationService.getMyOrganizationSettings();
      const nextOrganization = {
        ...(contextOrganization || {}),
        socialLinks: response?.settings?.socialLinks || contextOrganization?.socialLinks || {},
        updatedAt: response?.settings?.updatedAt || contextOrganization?.updatedAt || null,
      };

      setOrganization(nextOrganization);
      setFormValues(buildOrganizationSettingsForm(nextOrganization));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, [contextOrganization]);

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

    const nextErrors = validateOrganizationSettingsForm(formValues);

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = buildOrganizationSettingsPayload(formValues);
      const response = await organizationService.updateMyOrganizationSettings(payload);
      const nextSettings = response?.settings || null;

      if (nextSettings) {
        setOrganization((current) => ({
          ...(current || {}),
          socialLinks: nextSettings.socialLinks || {},
          updatedAt: nextSettings.updatedAt || current?.updatedAt || null,
        }));
        setFormValues(buildOrganizationSettingsForm({ socialLinks: nextSettings.socialLinks || {} }));
      }

      await refreshOrganizationContext();
      toast.success("Settings updated successfully");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Something went wrong");
      toast.error(saveError instanceof Error ? saveError.message : "Unable to update settings");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading && !organization) {
    return <OrganizationSettingsSkeleton />;
  }

  if (error && !organization) {
    return <ErrorState title="Unable to load settings" message={error} onRetry={loadSettings} />;
  }

  if (!canView && !organization) {
    return <ErrorState title="Settings unavailable" message="You do not have permission to view organization settings." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Organization management"
        title="Organization Settings"
        description="Manage the organization's social and public links."
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800/70 pb-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Social links</p>
              <p className="text-sm text-slate-400">Keep the organization's public link profile in sync with the backend.</p>
            </div>
            {!canEdit ? (
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                View only
              </span>
            ) : null}
          </div>

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <fieldset disabled={!canEdit || isSaving}>
              <div className="grid gap-4">
                {socialFields.map((field) => {
                  const Icon = field.icon;

                  return (
                    <FormField
                      key={field.key}
                      label={field.label}
                      helperText={`Optional. If provided, it should be a valid URL.`}
                      error={fieldErrors[field.key]}
                    >
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                          <Icon className="h-4 w-4" />
                        </span>
                        <input
                          value={formValues[field.key]}
                          onChange={(event) => updateField(field.key, event.target.value)}
                          placeholder={field.placeholder}
                          className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm outline-none transition focus:border-app-500 focus:ring-2 focus:ring-app-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    </FormField>
                  );
                })}
              </div>
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
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white">Settings overview</h3>
              <p className="text-sm leading-6 text-slate-400">
                These settings are stored in the organization's backend record and refreshed back into the organization
                context after every successful save.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Last updated</p>
                  <p className="mt-2 text-sm text-slate-200">{lastUpdated}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Editing</p>
                  <p className="mt-2 text-sm text-slate-200">{canEdit ? "Enabled" : "Read only"}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-slate-800/70 bg-slate-950/85">
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white">Validation</h3>
              <p className="text-sm leading-6 text-slate-400">
                The form validates obvious URL mistakes and lets the backend remain the final source of truth for data
                rules and permissions.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default OrganizationSettingsPage;
