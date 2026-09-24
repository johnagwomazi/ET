import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Activity, Banknote, Building2, CalendarDays, Check, Clock3, Landmark, Mail,
  MapPin, Phone, ReceiptText, RotateCcw, ShieldAlert, Ticket, Trash2,
  TrendingUp, Users, WalletCards, X,
} from "lucide-react";
import Avatar from "../../components/dashboard/Avatar";
import ConfirmationDialog from "../../components/dashboard/ConfirmationDialog";
import Pagination from "../../components/dashboard/Pagination";
import StatCard from "../../components/dashboard/StatCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import BackButton from "../../components/layout/BackButton";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { ROUTE_PATHS } from "../../routes/routePaths";
import * as organizationService from "../../services/organization.service";
import { getOrganizationAvailableActions } from "../../utils/dashboardActions";
import { formatDate, formatDateTime, formatMoney, formatNumber, formatPercentage } from "../../utils/formatters";

const PAGE_SIZE = 10;
const tabs = [
  ["overview", "Overview"], ["events", "Events"], ["sales", "Ticket Sales"],
  ["finance", "Finance"], ["members", "Members"], ["activity", "Activity"],
];
const initialPages = { eventsPage: 1, salesPage: 1, withdrawalsPage: 1, membersPage: 1 };

function personName(person) {
  if (!person) return "Unassigned";
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email || "Unassigned";
}

function statusLabel(status) {
  if (status === "APPROVED") return "Active";
  if (status === "SUSPENDED") return "Suspended";
  return undefined;
}

function ticketCount(items = []) {
  return items.reduce((total, item) => total + Number(item.quantity || 0), 0);
}

function Info({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/65 p-3 sm:rounded-2xl sm:p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.18em]">{label}</p>
      </div>
      <div className="mt-2 break-words text-sm text-slate-200">{value || "Not provided"}</div>
    </div>
  );
}

function Records({ items = [], emptyTitle, emptyMessage, children }) {
  if (!items.length) return <EmptyState title={emptyTitle} message={emptyMessage} />;
  return <div className="space-y-3">{items.map((item) => <Card key={item.id || item.reference} className="border-slate-800/70 bg-slate-950/85 p-4">{children(item)}</Card>)}</div>;
}

function PageNav({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return <Pagination {...pagination} onPageChange={onPageChange} />;
}

function ActivityFeed({ items = [], limit }) {
  const visible = typeof limit === "number" ? items.slice(0, limit) : items;
  if (!visible.length) return <EmptyState title="No activity yet" message="Organization activity will appear here." />;
  return (
    <div className="space-y-3">
      {visible.map((item) => (
        <div key={item.id} className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/65 p-3 sm:rounded-2xl sm:p-4">
          <div className="h-fit rounded-xl bg-app-500/10 p-2 text-app-300 ring-1 ring-app-500/20"><Activity className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <p className="break-words text-sm font-semibold text-white">{item.title}</p>
              <time className="shrink-0 text-xs text-slate-500">{formatDateTime(item.occurredAt)}</time>
            </div>
            {item.description ? <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">{item.description}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewSection({ details, organization, currency, onShowActivity }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-5">
        <Card className="border-slate-800/70 bg-slate-950/85">
          <h2 className="text-base font-semibold text-white sm:text-lg">Organization information</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="Address" value={organization.address} icon={MapPin} />
            <Info label="Website" value={organization.website} icon={Building2} />
            <Info label="Owner email" value={organization.primaryAdmin?.email} icon={Mail} />
            <Info label="Last updated" value={formatDateTime(organization.updatedAt)} icon={Clock3} />
          </div>
        </Card>
        <Card className="border-slate-800/70 bg-slate-950/85">
          <h2 className="text-base font-semibold text-white sm:text-lg">Performance</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Info label="Net revenue" value={formatMoney(details.overview.netRevenue, currency)} icon={Banknote} />
            <Info label="Refunds" value={formatMoney(details.overview.refunds, currency)} icon={ReceiptText} />
            <Info label="Successful orders" value={formatNumber(details.overview.successfulOrders)} icon={Check} />
            <Info label="Sales rate" value={formatPercentage(details.overview.salesRate)} icon={TrendingUp} />
          </div>
        </Card>
      </div>
      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white sm:text-lg">Recent activity</h2>
          <Button variant="ghost" size="sm" onClick={onShowActivity}>View all</Button>
        </div>
        <div className="mt-4"><ActivityFeed items={details.activity} limit={6} /></div>
      </Card>
    </div>
  );
}

function EventsSection({ data, onPageChange }) {
  return <div className="space-y-4">
    <Records items={data.items} emptyTitle="No events" emptyMessage="This organization has not created any events.">
      {(event) => <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_auto_1fr_0.7fr_1fr] md:items-center">
        <div><p className="font-semibold text-white">{event.eventName}</p><p className="mt-1 text-xs text-slate-500">{formatDate(event.startAt)} to {formatDate(event.endAt)}</p></div>
        <StatusBadge status={event.status} />
        <Info label="Tickets sold" value={formatNumber(event.ticketsSold)} />
        <Info label="Gross sales" value={formatMoney(event.grossSales, event.currency)} />
        <Info label="Net revenue" value={formatMoney(event.netRevenue, event.currency)} />
      </div>}
    </Records>
    <PageNav pagination={data.pagination} onPageChange={onPageChange} />
  </div>;
}

function SalesSection({ data, onPageChange }) {
  return <div className="space-y-4">
    <Records items={data.items} emptyTitle="No ticket sales" emptyMessage="No purchases have been recorded for this organization.">
      {(sale) => <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_1.2fr_auto_auto_1fr] md:items-center">
        <div><p className="font-semibold text-white">{sale.reference}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(sale.paidAt || sale.createdAt)}</p></div>
        <div><p className="text-sm text-slate-200">{sale.customerInfo?.name || "Customer"}</p><p className="text-xs text-slate-500">{sale.customerInfo?.email}</p></div>
        <p className="text-sm text-slate-300">{sale.eventDetails?.eventName || "Event unavailable"}</p>
        <Info label="Tickets" value={formatNumber(ticketCount(sale.items))} />
        <StatusBadge status={sale.paymentStatus} />
        <p className="font-semibold text-white md:text-right">{formatMoney(sale.total, sale.currency)}</p>
      </div>}
    </Records>
    <PageNav pagination={data.pagination} onPageChange={onPageChange} />
  </div>;
}

function FinanceSection({ data, onPageChange }) {
  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
      <StatCard icon={TrendingUp} label="Gross Earnings" value={formatMoney(data.grossSales, data.currency)} />
      <StatCard icon={Banknote} label="Net Earnings" value={formatMoney(data.netRevenue, data.currency)} />
      <StatCard icon={WalletCards} label="Available" value={formatMoney(data.availableBalance, data.currency)} />
      <StatCard icon={Landmark} label="Withdrawn" value={formatMoney(data.completedWithdrawals, data.currency)} />
    </div>
    <Records items={data.withdrawals} emptyTitle="No withdrawals" emptyMessage="This organization has not requested a withdrawal.">
      {(withdrawal) => <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto_1fr_1fr] md:items-center">
        <div><p className="font-semibold text-white">{withdrawal.reference}</p><p className="mt-1 text-xs text-slate-500">{personName(withdrawal.requester)}</p></div>
        <p className="text-lg font-semibold text-white">{formatMoney(withdrawal.amount, withdrawal.currency)}</p>
        <StatusBadge status={withdrawal.status} />
        <Info label="Requested" value={formatDateTime(withdrawal.requestedAt)} />
        <Info label="Completed" value={formatDateTime(withdrawal.completedAt)} />
      </div>}
    </Records>
    <PageNav pagination={data.pagination} onPageChange={onPageChange} />
  </div>;
}

function MembersSection({ data, onPageChange }) {
  return <div className="space-y-4">
    <Records items={data.items} emptyTitle="No members" emptyMessage="No active organization members were found.">
      {(member) => <div className="grid gap-3 md:grid-cols-[1.4fr_0.7fr_auto_1fr] md:items-center">
        <div className="flex items-center gap-3"><Avatar name={personName(member)} size="sm" /><div><p className="font-semibold text-white">{personName(member)}</p><p className="text-xs text-slate-500">{member.email}</p></div></div>
        <Info label="Role" value={member.isOwner ? "Owner" : member.role} />
        <StatusBadge status={member.accountStatus} />
        <Info label="Joined" value={formatDate(member.createdAt)} />
      </div>}
    </Records>
    <PageNav pagination={data.pagination} onPageChange={onPageChange} />
  </div>;
}

function OrganizationDetailsPage() {
  const { organizationId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [pages, setPages] = useState(initialPages);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState("");
  const [activeDialog, setActiveDialog] = useState(null);

  const loadDetails = useCallback(async (signal) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await organizationService.getOrganizationDetails(
        organizationId,
        { ...pages, limit: PAGE_SIZE },
        { signal }
      );
      if (!signal?.aborted) setDetails(response);
    } catch (requestError) {
      if (!signal?.aborted) setError(requestError.message || "Unable to load organization details");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [organizationId, pages]);

  useEffect(() => {
    const controller = new AbortController();
    loadDetails(controller.signal);
    return () => controller.abort();
  }, [loadDetails]);

  const organization = details?.organization;
  const currency = details?.summary?.currency || "NGN";
  const actions = getOrganizationAvailableActions(organization);

  function changePage(key, page) {
    setPages((current) => ({ ...current, [key]: page }));
  }

  async function submitAction(reason) {
    if (!activeDialog) return;
    setIsMutating(true);
    try {
      if (activeDialog === "approve") {
        await organizationService.approveOrganization(organizationId);
        toast.success("Organization approved successfully");
      } else if (activeDialog === "reject") {
        await organizationService.rejectOrganization(organizationId, { rejectionReason: reason });
        toast.success("Organization rejected successfully");
      } else if (activeDialog === "suspend") {
        await organizationService.suspendOrganization(organizationId, { suspensionReason: reason });
        toast.success("Organization suspended successfully");
      } else if (activeDialog === "reactivate") {
        await organizationService.reactivateOrganization(organizationId);
        toast.success("Organization reactivated successfully");
      } else if (activeDialog === "delete") {
        await organizationService.deleteOrganization(organizationId);
        toast.success("Organization deleted successfully");
        navigate(ROUTE_PATHS.SUPER_ADMIN_ORGANIZATIONS, { replace: true });
        return;
      }
      setActiveDialog(null);
      await loadDetails();
    } catch (actionError) {
      toast.error(actionError.message || "Action failed");
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading && !details) return <LoadingState label="Loading organization details..." />;
  if (error && !details) return <ErrorState title="Organization unavailable" message={error} onRetry={() => loadDetails()} />;
  if (!organization) return null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <BackButton to={ROUTE_PATHS.SUPER_ADMIN_ORGANIZATIONS} label="Back to organizations" />

      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <Avatar name={organization.organizationName} src={organization.logo?.url} size="lg" className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-300">Organization details</p>
              <h1 className="mt-1 break-words text-xl font-semibold text-white sm:text-3xl">{organization.organizationName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={organization.status} label={statusLabel(organization.status)} />
                <span className="text-xs text-slate-500">Registered {formatDate(organization.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.includes("approve") ? <Button size="sm" onClick={() => setActiveDialog("approve")}><Check className="h-4 w-4" />Approve</Button> : null}
            {actions.includes("reject") ? <Button size="sm" variant="danger" onClick={() => setActiveDialog("reject")}><X className="h-4 w-4" />Reject</Button> : null}
            {actions.includes("suspend") ? <Button size="sm" variant="secondary" onClick={() => setActiveDialog("suspend")}><ShieldAlert className="h-4 w-4" />Suspend</Button> : null}
            {actions.includes("reactivate") ? <Button size="sm" onClick={() => setActiveDialog("reactivate")}><RotateCcw className="h-4 w-4" />Reactivate</Button> : null}
            {actions.includes("delete") ? <Button size="sm" variant="danger" onClick={() => setActiveDialog("delete")}><Trash2 className="h-4 w-4" />Delete</Button> : null}
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Info label="Owner" value={personName(organization.primaryAdmin)} icon={Users} />
          <Info label="Business email" value={organization.businessEmail} icon={Mail} />
          <Info label="Business phone" value={organization.businessPhone} icon={Phone} />
          <Info label="Registration date" value={formatDateTime(organization.createdAt)} icon={CalendarDays} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Building2} label="Total Events" value={formatNumber(details.summary.totalEvents)} />
        <StatCard icon={Clock3} label="Current Events" value={formatNumber(details.summary.currentEvents)} helperText="Upcoming or live" />
        <StatCard icon={Ticket} label="Tickets Sold" value={formatNumber(details.summary.ticketsSold)} />
        <StatCard icon={TrendingUp} label="Gross Ticket Sales" value={formatMoney(details.summary.grossTicketSales, currency)} />
        <StatCard icon={WalletCards} label="Available Balance" value={formatMoney(details.summary.availableBalance, currency)} />
        <StatCard icon={Clock3} label="Pending Withdrawals" value={formatMoney(details.summary.pendingWithdrawals, currency)} />
        <StatCard icon={Landmark} label="Total Withdrawn" value={formatMoney(details.summary.totalWithdrawn, currency)} />
      </div>

      {error ? <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="overflow-x-auto border-b border-slate-800" role="tablist" aria-label="Organization details sections">
        <div className="flex min-w-max gap-1">
          {tabs.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={activeTab === value} onClick={() => setActiveTab(value)} className={`border-b-2 px-3 py-3 text-xs font-semibold transition sm:px-4 sm:text-sm ${activeTab === value ? "border-app-400 text-app-200" : "border-transparent text-slate-400 hover:text-slate-200"}`}>{label}</button>)}
        </div>
      </div>

      {activeTab === "overview" ? <OverviewSection details={details} organization={organization} currency={currency} onShowActivity={() => setActiveTab("activity")} /> : null}
      {activeTab === "events" ? <EventsSection data={details.events} onPageChange={(page) => changePage("eventsPage", page)} /> : null}
      {activeTab === "sales" ? <SalesSection data={details.ticketSales} onPageChange={(page) => changePage("salesPage", page)} /> : null}
      {activeTab === "finance" ? <FinanceSection data={details.finance} onPageChange={(page) => changePage("withdrawalsPage", page)} /> : null}
      {activeTab === "members" ? <MembersSection data={details.members} onPageChange={(page) => changePage("membersPage", page)} /> : null}
      {activeTab === "activity" ? <Card className="border-slate-800/70 bg-slate-950/85"><h2 className="text-base font-semibold text-white sm:text-lg">Organization activity</h2><div className="mt-4"><ActivityFeed items={details.activity} /></div></Card> : null}

      <ConfirmationDialog
        open={Boolean(activeDialog)}
        title={activeDialog === "approve" ? "Approve organization" : activeDialog === "reject" ? "Reject organization" : activeDialog === "suspend" ? "Suspend organization" : activeDialog === "reactivate" ? "Reactivate organization" : "Delete organization"}
        message={activeDialog === "approve" ? "This will move the organization into the approved state." : activeDialog === "reject" ? "Provide a reason so the organization knows what needs to be addressed." : activeDialog === "suspend" ? "Suspended organizations cannot access the platform until they are reactivated." : activeDialog === "reactivate" ? "Reactivate this organization and restore access." : "This will permanently mark the organization as deleted."}
        confirmText={activeDialog ? `${activeDialog.charAt(0).toUpperCase()}${activeDialog.slice(1)}` : "Confirm"}
        tone={activeDialog === "approve" || activeDialog === "reactivate" ? "primary" : "danger"}
        requiresReason={activeDialog === "reject" || activeDialog === "suspend"}
        reasonLabel="Reason"
        reasonPlaceholder="Tell the organization why this decision was made..."
        isLoading={isMutating}
        onCancel={() => setActiveDialog(null)}
        onConfirm={submitAction}
      />
    </div>
  );
}

export default OrganizationDetailsPage;
