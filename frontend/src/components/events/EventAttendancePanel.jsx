import { useEffect, useMemo, useState } from "react";
import { Download, Plus, RefreshCw, Users } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import SearchInput from "../dashboard/SearchInput";
import Pagination from "../dashboard/Pagination";
import Avatar from "../dashboard/Avatar";
import { Skeleton, SkeletonText } from "../common/Skeleton";
import { formatDateTime, formatNumber } from "../../utils/formatters";
import { downloadResponseBlob } from "../../utils/fileDownload";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import * as eventService from "../../services/event.service";

const ATTENDANCE_PAGE_LIMIT = 10;

function getDisplayName(attendance) {
  return attendance?.name || "Unnamed attendee";
}

function getEventId(event) {
  return event?._id || event?.id || null;
}

function attendanceServiceForScope(scope) {
  if (scope === "manager") {
    return {
      list: eventService.getManagerEventAttendance,
      record: eventService.recordManagerEventAttendance,
      exportPdf: eventService.getManagerEventAttendancePdf,
      exportExcel: eventService.getManagerEventAttendanceExcel,
      count: eventService.getManagerEventAttendanceCount,
    };
  }

  return {
    list: eventService.getOrganizationEventAttendance,
    record: eventService.recordOrganizationEventAttendance,
    exportPdf: eventService.getOrganizationEventAttendancePdf,
    exportExcel: eventService.getOrganizationEventAttendanceExcel,
    count: eventService.getOrganizationEventAttendanceCount,
  };
}

function AttendanceRowSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-5 w-44 rounded-full" />
          <SkeletonText className="h-4 w-56" />
          <SkeletonText className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
}

function AttendanceCard({ attendance }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-start gap-3">
        <Avatar name={getDisplayName(attendance)} size="md" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-white">{getDisplayName(attendance)}</p>
          </div>
          <p className="truncate text-sm text-slate-400">{attendance.email || "No email provided"}</p>
          <p className="truncate text-sm text-slate-400">{attendance.phone || "No phone provided"}</p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1">
              Checked in {formatDateTime(attendance.checkedInAt)}
            </span>
            {attendance.checkedInBy ? (
              <span className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1">
                By {attendance.checkedInBy.name || attendance.checkedInBy.email || "Unknown"}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventAttendancePanel({ event, scope = "organization" }) {
  const eventId = getEventId(event);
  const service = useMemo(() => attendanceServiceForScope(scope), [scope]);
  const [attendance, setAttendance] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [queryPage, setQueryPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [downloadType, setDownloadType] = useState(null);
  const [formValues, setFormValues] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const debouncedSearch = useDebouncedValue(searchValue, 300);

  async function loadAttendance({ page = queryPage, search = debouncedSearch } = {}) {
    if (!eventId) {
      setAttendance([]);
      setPagination(null);
      setTotalAttendees(0);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await service.list(eventId, {
        page,
        limit: ATTENDANCE_PAGE_LIMIT,
        search,
      });

      setAttendance(response?.attendance || []);
      setPagination(response?.pagination || null);
      setTotalAttendees(response?.totalAttendees || 0);
      return response;
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load attendance";
      setError(message);
      throw loadError;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (debouncedSearch === undefined) {
      return;
    }

    setQueryPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadAttendance({ page: queryPage, search: debouncedSearch }).catch(() => {});
  }, [eventId, queryPage, scope, debouncedSearch]);

  function openCheckInModal() {
    setFormErrors({});
    setFormValues({
      name: "",
      phone: "",
      email: "",
    });
    setIsCheckInOpen(true);
  }

  function closeCheckInModal() {
    setIsCheckInOpen(false);
    setFormErrors({});
  }

  function updateField(field, value) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));

    setFormErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!formValues.name.trim()) {
      nextErrors.name = "Name is required";
    }

    if (!formValues.phone.trim()) {
      nextErrors.phone = "Phone number is required";
    }

    if (!formValues.email.trim()) {
      nextErrors.email = "Email is required";
    }

    setFormErrors(nextErrors);
    return nextErrors;
  }

  async function handleCheckIn(event) {
    event?.preventDefault?.();

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSavingAttendance(true);

    try {
      await service.record(eventId, {
        name: formValues.name.trim(),
        phone: formValues.phone.trim(),
        email: formValues.email.trim(),
      });

      toast.success("Attendance recorded successfully");
      closeCheckInModal();
      await loadAttendance({ page: queryPage, search: debouncedSearch }).catch(() => {});
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to record attendance";
      toast.error(message);
    } finally {
      setIsSavingAttendance(false);
    }
  }

  async function handleDownload(type) {
    if (downloadType) {
      return;
    }

    setDownloadType(type);

    try {
      const exportQuery = debouncedSearch ? { search: debouncedSearch } : {};
      const response = type === "pdf" ? await service.exportPdf(eventId, exportQuery) : await service.exportExcel(eventId, exportQuery);
      const fallbackName = `${(event?.eventName || "event").replace(/[^\w.-]+/g, "-").toLowerCase()}-attendance.${type === "pdf" ? "pdf" : "xlsx"}`;

      downloadResponseBlob(response, fallbackName);
      toast.success(`${type.toUpperCase()} export downloaded`);
    } catch (downloadError) {
      const message = downloadError instanceof Error ? downloadError.message : "Unable to export attendance";
      toast.error(message);
    } finally {
      setDownloadType(null);
    }
  }

  async function handleRefresh() {
    await loadAttendance({ page: queryPage, search: debouncedSearch }).catch(() => {});
    if (service.count) {
      try {
        const countResponse = await service.count(eventId);
        if (typeof countResponse?.totalAttendees === "number") {
          setTotalAttendees(countResponse.totalAttendees);
        }
      } catch (countError) {
        // The list endpoint already carries the total. Keep the panel usable if the count call fails.
        void countError;
      }
    }
  }

  return (
    <Card className="border-slate-800/70 bg-slate-950/85">
      <div className="flex flex-col gap-4 border-b border-slate-800/70 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">
            {scope === "manager" ? "Manager attendance" : "Attendance"}
          </p>
          <h3 className="text-lg font-semibold text-white">Event check-in and exports</h3>
          <p className="text-sm leading-6 text-slate-400">
            Record attendees, review the current check-in list, and export the backend-generated attendance reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleRefresh} isLoading={isLoading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleDownload("pdf")} isLoading={downloadType === "pdf"}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleDownload("excel")} isLoading={downloadType === "excel"}>
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button size="sm" onClick={openCheckInModal}>
            <Plus className="h-4 w-4" />
            Check in attendee
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
        <Card className="border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-app-500/10 p-3 text-app-300 ring-1 ring-app-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Checked in</p>
              <p className="text-sm text-slate-400">{formatNumber(totalAttendees)} attendees recorded</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Current page</p>
              <p className="mt-2 text-2xl font-semibold text-white">{pagination?.page || 1}</p>
              <p className="mt-1 text-sm text-slate-400">
                {pagination?.totalPages ? `of ${pagination.totalPages}` : "No pagination data"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Latest update</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {attendance.length > 0 ? formatDateTime(attendance[0]?.checkedInAt) : "No attendees yet"}
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-800 bg-slate-950/70 p-4">
            <SearchInput
              label="Search attendance"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by name, phone, or email"
            />
          </Card>

          {isLoading && attendance.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <AttendanceRowSkeleton key={`attendance-skeleton-${index}`} />
              ))}
            </div>
          ) : error && attendance.length === 0 ? (
            <ErrorState
              title="Unable to load attendance"
              message={error}
              onRetry={() => {
                handleRefresh().catch(() => {});
              }}
            />
          ) : attendance.length > 0 ? (
            <div className="space-y-3">
              {attendance.map((record) => (
                <AttendanceCard key={record.id || `${record.email}-${record.checkedInAt}`} attendance={record} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No attendance records yet"
              message="Check in the first attendee to start building the event attendance list."
            />
          )}

          {pagination?.totalPages > 1 ? (
            <Pagination
              page={pagination.page || 1}
              totalPages={pagination.totalPages || 1}
              totalItems={pagination.totalItems || 0}
              onPageChange={(nextPage) => setQueryPage(nextPage)}
            />
          ) : null}
        </div>
      </div>

      <Modal
        open={isCheckInOpen}
        title="Check in attendee"
        onClose={closeCheckInModal}
        className="max-w-lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={closeCheckInModal} disabled={isSavingAttendance}>
              Cancel
            </Button>
            <Button onClick={handleCheckIn} isLoading={isSavingAttendance} loadingText="Saving...">
              Save attendance
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleCheckIn}>
          <Input
            label="Full name"
            value={formValues.name}
            onChange={(event) => updateField("name", event.target.value)}
            error={formErrors.name}
            placeholder="Attendee name"
          />
          <Input
            label="Phone number"
            value={formValues.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            error={formErrors.phone}
            placeholder="+234..."
          />
          <Input
            label="Email address"
            type="email"
            value={formValues.email}
            onChange={(event) => updateField("email", event.target.value)}
            error={formErrors.email}
            placeholder="attendee@example.com"
          />
        </form>
      </Modal>
    </Card>
  );
}

export default EventAttendancePanel;
