import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileSpreadsheet,
  FileText,
  Keyboard,
  RefreshCw,
  ScanLine,
  TicketCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import SearchInput from "../dashboard/SearchInput";
import Pagination from "../dashboard/Pagination";
import Avatar from "../dashboard/Avatar";
import StatusBadge from "../dashboard/StatusBadge";
import TicketScannerModal from "../ticketing/TicketScannerModal";
import { Skeleton, SkeletonText } from "../common/Skeleton";
import { formatDateTime, formatNumber } from "../../utils/formatters";
import { downloadResponseBlob } from "../../utils/fileDownload";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  EVENT_CHECK_IN_STATUS,
  TICKET_VALIDATION_META,
  TICKET_VALIDATION_OUTCOME,
} from "../../constants/ticketing.constants";
import * as eventService from "../../services/event.service";

const ATTENDANCE_PAGE_LIMIT = 10;
const RECENT_CHECK_IN_LIMIT = 6;
const LIVE_REFRESH_INTERVAL_MS = 10_000;

const resultToneClasses = {
  success: {
    container: "border-emerald-500/30 bg-emerald-500/10",
    icon: "text-emerald-300",
    title: "text-emerald-100",
  },
  warning: {
    container: "border-amber-500/30 bg-amber-500/10",
    icon: "text-amber-300",
    title: "text-amber-100",
  },
  danger: {
    container: "border-rose-500/30 bg-rose-500/10",
    icon: "text-rose-300",
    title: "text-rose-100",
  },
};

function getDisplayName(attendance) {
  return attendance?.name || "Unnamed attendee";
}

function getEventId(event) {
  return event?._id || event?.id || null;
}

function getUserDisplayName(user) {
  if (!user) return "Unknown";

  return user.name
    || `${user.firstName || ""} ${user.lastName || ""}`.trim()
    || user.email
    || "Unknown";
}

function formatSyncTime(value) {
  if (!value) return "Waiting for data";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function buildTicketPayload(value, source = "manual") {
  const code = String(value || "").trim();

  if (!code) return null;

  if (source === "scan" || !/^tkt_/i.test(code)) {
    return { token: code };
  }

  return { reference: code };
}

function attendanceServiceForScope(scope) {
  if (scope === "manager") {
    return {
      list: eventService.getManagerEventAttendance,
      recent: eventService.getManagerEventRecentAttendance,
      record: eventService.recordManagerEventAttendance,
      exportPdf: eventService.getManagerEventAttendancePdf,
      exportExcel: eventService.getManagerEventAttendanceExcel,
      count: eventService.getManagerEventAttendanceCount,
      validateTicket: eventService.validateManagerTicket,
      checkInTicket: eventService.checkInManagerTicket,
    };
  }

  return {
    list: eventService.getOrganizationEventAttendance,
    recent: eventService.getOrganizationEventRecentAttendance,
    record: eventService.recordOrganizationEventAttendance,
    exportPdf: eventService.getOrganizationEventAttendancePdf,
    exportExcel: eventService.getOrganizationEventAttendanceExcel,
    count: eventService.getOrganizationEventAttendanceCount,
    validateTicket: eventService.validateOrganizationTicket,
    checkInTicket: eventService.checkInOrganizationTicket,
  };
}

function vibrate(pattern) {
  navigator.vibrate?.(pattern);
}

function getFailureResult(error) {
  const outcome = error?.data?.outcome
    || (error?.status === 401 || error?.status === 403 ? TICKET_VALIDATION_OUTCOME.UNAUTHORIZED : null)
    || (typeof error?.status === "number"
      ? TICKET_VALIDATION_OUTCOME.SERVICE_ERROR
      : TICKET_VALIDATION_OUTCOME.NETWORK_ERROR);

  return {
    valid: false,
    outcome,
    ticket: error?.data?.ticket || null,
    attendance: error?.data?.attendance || null,
    reason: TICKET_VALIDATION_META[outcome]?.message || "The ticket could not be checked.",
  };
}

function AttendanceRowSkeleton() {
  return (
    <div className="border-b border-slate-800/80 px-4 py-4 last:border-0">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-5 w-44 rounded-full" />
          <SkeletonText className="h-4 w-56" />
          <SkeletonText className="h-4 w-48" />
        </div>
      </div>
    </div>
  );
}

function AttendanceCard({ attendance, compact = false }) {
  return (
    <div className="border-b border-slate-800/80 px-4 py-4 last:border-0">
      <div className="flex items-start gap-3">
        <Avatar name={getDisplayName(attendance)} size="md" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-white">{getDisplayName(attendance)}</p>
            {attendance.ticketStatus ? <StatusBadge status={attendance.ticketStatus} /> : null}
          </div>
          {!compact ? (
            <div className="grid gap-1 text-sm text-slate-400 sm:grid-cols-2">
              <p className="truncate">{attendance.email || "No email provided"}</p>
              <p className="truncate">{attendance.phone || "No phone provided"}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{formatDateTime(attendance.checkedInAt)}</span>
            {attendance.ticketType?.name ? <span>{attendance.ticketType.name}</span> : null}
            {attendance.ticketReference ? <span className="font-mono">{attendance.ticketReference}</span> : null}
            {!compact && attendance.checkedInBy ? <span>By {getUserDisplayName(attendance.checkedInBy)}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceSummary({ isLoading, totalAttendees, attendancePercentage, lastSyncedAt }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      <Card className="border-slate-800/70 bg-slate-950/85 p-2.5 sm:p-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-app-300" />
          <div>
            <p className="text-xs text-slate-500">Checked in</p>
            {isLoading ? <Skeleton className="mt-2 h-7 w-14" /> : <p className="mt-1 text-lg font-semibold text-white sm:text-2xl">{formatNumber(totalAttendees)}</p>}
          </div>
        </div>
      </Card>
      <Card className="border-slate-800/70 bg-slate-950/85 p-2.5 sm:p-4">
        <div className="flex items-center gap-3">
          <TicketCheck className="h-5 w-5 text-emerald-300" />
          <div>
            <p className="text-xs text-slate-500">Capacity used</p>
            {isLoading ? <Skeleton className="mt-2 h-7 w-16" /> : <p className="mt-1 text-lg font-semibold text-white sm:text-2xl">{attendancePercentage}%</p>}
          </div>
        </div>
      </Card>
      <Card className="col-span-2 border-slate-800/70 bg-slate-950/85 p-2.5 sm:col-span-1 sm:p-4">
        <div className="flex items-center gap-3">
          <Clock3 className="h-5 w-5 text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">Last synced</p>
            {isLoading ? <Skeleton className="mt-2 h-5 w-20 max-w-full" /> : <p className="mt-1 text-sm font-semibold text-white">{formatSyncTime(lastSyncedAt)}</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}

function TicketResult({ result, eventName, canCheckIn, isCheckingIn, onCheckIn, onReset, onRetry }) {
  if (!result) return null;

  const outcome = result.outcome || (result.checkedIn || result.valid ? TICKET_VALIDATION_OUTCOME.VALID : null);
  const meta = result.checkedIn
    ? { title: "Check-in complete", message: "Entry has been confirmed and attendance recorded.", tone: "success" }
    : TICKET_VALIDATION_META[outcome] || { title: "Ticket rejected", tone: "danger" };
  const tone = resultToneClasses[meta.tone] || resultToneClasses.danger;
  const ResultIcon = meta.tone === "success"
    ? CheckCircle2
    : meta.tone === "warning"
      ? CircleAlert
      : XCircle;
  const ticket = result.ticket || {};
  const attendee = ticket.attendee || result.attendance || {};

  return (
    <div className={`border p-4 ${tone.container}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <ResultIcon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`font-semibold ${tone.title}`}>{meta.title}</p>
            {ticket.status ? <StatusBadge status={ticket.status} /> : null}
          </div>
          <p className="mt-1 text-sm text-slate-300">{meta.message || result.reason || "Ticket validation complete"}</p>

          {attendee.name || ticket.reference ? (
            <dl className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Attendee</dt>
                <dd className="mt-1 truncate text-sm font-medium text-white">{attendee.name || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Ticket</dt>
                <dd className="mt-1 truncate font-mono text-sm text-slate-200">{ticket.reference || "Unavailable"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Type</dt>
                <dd className="mt-1 text-sm text-slate-200">{ticket.ticketTypeDetails?.name || "Standard"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Check-in time</dt>
                <dd className="mt-1 text-sm text-slate-200">
                  {result.attendance?.checkedInAt || ticket.checkedInAt
                    ? formatDateTime(result.attendance?.checkedInAt || ticket.checkedInAt)
                    : "Not checked in"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Event</dt>
                <dd className="mt-1 truncate text-sm text-slate-200">{eventName || "Assigned event"}</dd>
              </div>
            </dl>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {result.valid && !result.checkedIn && canCheckIn ? (
              <Button onClick={onCheckIn} isLoading={isCheckingIn} className="sm:flex-1">
                <TicketCheck className="h-4 w-4" />
                Confirm check-in
              </Button>
            ) : null}
            {[TICKET_VALIDATION_OUTCOME.NETWORK_ERROR, TICKET_VALIDATION_OUTCOME.SERVICE_ERROR].includes(outcome) ? (
              <Button variant="secondary" onClick={onRetry} disabled={isCheckingIn} className="sm:flex-1">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onReset} disabled={isCheckingIn} className="sm:flex-1">
              <ScanLine className="h-4 w-4" />
              Next ticket
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventAttendancePanel({ event, scope = "organization" }) {
  const eventId = getEventId(event);
  const service = useMemo(() => attendanceServiceForScope(scope), [scope]);
  const pollingRef = useRef(false);
  const attendanceRequestRef = useRef(0);
  const liveRequestRef = useRef(0);
  const attendanceControllerRef = useRef(null);
  const liveControllerRef = useRef(null);
  const ticketValidationLockRef = useRef(false);
  const ticketCheckInLockRef = useRef(false);
  const [attendance, setAttendance] = useState([]);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [queryPage, setQueryPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveLoading, setIsLiveLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [isManualCheckInOpen, setIsManualCheckInOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [downloadType, setDownloadType] = useState(null);
  const [formValues, setFormValues] = useState({ name: "", phone: "", email: "" });
  const [formErrors, setFormErrors] = useState({});
  const [ticketCode, setTicketCode] = useState("");
  const [ticketPayload, setTicketPayload] = useState(null);
  const [ticketResult, setTicketResult] = useState(null);
  const [isValidatingTicket, setIsValidatingTicket] = useState(false);
  const [isCheckingInTicket, setIsCheckingInTicket] = useState(false);

  const debouncedSearch = useDebouncedValue(searchValue, 300);
  const canCheckIn = event?.status === EVENT_CHECK_IN_STATUS;
  const attendancePercentage = Number(event?.capacity) > 0
    ? Math.min(100, Math.round((totalAttendees / Number(event.capacity)) * 100))
    : 0;

  async function loadAttendance({ page = queryPage, search = debouncedSearch, quiet = false } = {}) {
    if (!eventId) {
      setAttendance([]);
      setPagination(null);
      setTotalAttendees(0);
      return null;
    }

    const requestId = attendanceRequestRef.current + 1;
    attendanceRequestRef.current = requestId;
    attendanceControllerRef.current?.abort();
    const controller = new AbortController();
    attendanceControllerRef.current = controller;

    if (!quiet) setIsLoading(true);
    setError(null);

    try {
      const response = await service.list(
        eventId,
        { page, limit: ATTENDANCE_PAGE_LIMIT, search },
        { signal: controller.signal }
      );

      if (controller.signal.aborted || requestId !== attendanceRequestRef.current) {
        return response;
      }

      setAttendance(response?.attendance || []);
      setPagination(response?.pagination || null);
      setTotalAttendees(response?.totalAttendees || 0);
      setLastSyncedAt(new Date());
      return response;
    } catch (loadError) {
      if (controller.signal.aborted || requestId !== attendanceRequestRef.current) {
        return null;
      }

      const message = loadError instanceof Error ? loadError.message : "Unable to load attendance";
      setError(message);
      throw loadError;
    } finally {
      if (!quiet && requestId === attendanceRequestRef.current) setIsLoading(false);
      if (attendanceControllerRef.current === controller) attendanceControllerRef.current = null;
    }
  }

  async function loadLiveSummary() {
    if (!eventId || pollingRef.current) return;
    pollingRef.current = true;
    const requestId = liveRequestRef.current + 1;
    liveRequestRef.current = requestId;
    liveControllerRef.current?.abort();
    const controller = new AbortController();
    liveControllerRef.current = controller;

    try {
      const [recentResult, countResult] = await Promise.allSettled([
        service.recent(eventId, { limit: RECENT_CHECK_IN_LIMIT }, { signal: controller.signal }),
        service.count(eventId, { signal: controller.signal }),
      ]);

      if (controller.signal.aborted || requestId !== liveRequestRef.current) return;

      if (recentResult.status === "fulfilled") {
        setRecentCheckIns(recentResult.value?.recentCheckIns || []);
        if (typeof recentResult.value?.totalAttendees === "number") {
          setTotalAttendees(recentResult.value.totalAttendees);
        }
      }

      if (countResult.status === "fulfilled" && typeof countResult.value?.totalAttendees === "number") {
        setTotalAttendees(countResult.value.totalAttendees);
      }

      if (recentResult.status === "fulfilled" || countResult.status === "fulfilled") {
        setLastSyncedAt(new Date());
      }
    } finally {
      if (requestId === liveRequestRef.current) {
        pollingRef.current = false;
        setIsLiveLoading(false);
      }
      if (liveControllerRef.current === controller) liveControllerRef.current = null;
    }
  }

  useEffect(() => {
    setQueryPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadAttendance({ page: queryPage, search: debouncedSearch }).catch(() => {});

    return () => {
      attendanceControllerRef.current?.abort();
      attendanceRequestRef.current += 1;
    };
  }, [eventId, queryPage, scope, debouncedSearch]);

  useEffect(() => {
    setIsLiveLoading(true);
    loadLiveSummary().catch(() => {});

    const intervalId = canCheckIn
      ? window.setInterval(() => {
          if (document.visibilityState === "visible") {
            loadLiveSummary().catch(() => {});
          }
        }, LIVE_REFRESH_INTERVAL_MS)
      : null;

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      liveControllerRef.current?.abort();
      liveRequestRef.current += 1;
      pollingRef.current = false;
    };
  }, [canCheckIn, eventId, scope]);

  async function refreshAll() {
    setIsRefreshing(true);
    await Promise.allSettled([
      loadAttendance({ page: queryPage, search: debouncedSearch, quiet: true }),
      loadLiveSummary(),
    ]);
    setIsRefreshing(false);
  }

  function resetTicketStation() {
    setTicketCode("");
    setTicketPayload(null);
    setTicketResult(null);
  }

  async function validateTicket(value, source = "manual") {
    if (ticketValidationLockRef.current || isCheckingInTicket) return null;

    const payload = buildTicketPayload(value, source);

    if (!payload) {
      toast.error("Enter a ticket reference or scan a QR code");
      return null;
    }

    setTicketCode(String(value).trim());
    setTicketPayload(payload);
    setTicketResult(null);
    setIsValidatingTicket(true);
    ticketValidationLockRef.current = true;

    try {
      const response = await service.validateTicket(eventId, payload);
      setTicketResult(response);
      vibrate(response?.valid ? 80 : [80, 50, 80]);
      return response;
    } catch (validateError) {
      const failure = getFailureResult(validateError);
      setTicketResult(failure);
      vibrate([80, 50, 80]);
      return failure;
    } finally {
      ticketValidationLockRef.current = false;
      setIsValidatingTicket(false);
    }
  }

  function handleScannedTicket(value) {
    setIsScannerOpen(false);
    validateTicket(value, "scan").catch(() => {});
  }

  async function handleTicketCheckIn() {
    if (ticketCheckInLockRef.current || isValidatingTicket) return;

    if (!ticketPayload || !ticketResult?.valid) {
      toast.error("Validate the ticket before check-in");
      return;
    }

    setIsCheckingInTicket(true);
    ticketCheckInLockRef.current = true;

    try {
      const response = await service.checkInTicket(eventId, ticketPayload);
      setTicketResult(response);

      if (response?.checkedIn) {
        toast.success("Ticket checked in successfully");
        vibrate(120);
        await refreshAll();
      }
    } catch (checkInError) {
      const failure = getFailureResult(checkInError);
      setTicketResult(failure);
      toast.error(failure.reason);
      vibrate([100, 60, 100]);
    } finally {
      ticketCheckInLockRef.current = false;
      setIsCheckingInTicket(false);
    }
  }

  function openManualCheckIn() {
    setFormErrors({});
    setFormValues({ name: "", phone: "", email: "" });
    setIsManualCheckInOpen(true);
  }

  function updateField(field, value) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validateAttendanceForm() {
    const nextErrors = {};
    if (!formValues.name.trim()) nextErrors.name = "Name is required";
    if (!formValues.phone.trim()) nextErrors.phone = "Phone number is required";
    if (!formValues.email.trim()) nextErrors.email = "Email is required";
    setFormErrors(nextErrors);
    return nextErrors;
  }

  async function handleManualCheckIn(submitEvent) {
    submitEvent?.preventDefault?.();
    const nextErrors = validateAttendanceForm();
    if (Object.keys(nextErrors).length > 0) return;

    setIsSavingAttendance(true);
    try {
      await service.record(eventId, {
        name: formValues.name.trim(),
        phone: formValues.phone.trim(),
        email: formValues.email.trim(),
      });
      toast.success("Attendance recorded successfully");
      setIsManualCheckInOpen(false);
      await refreshAll();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to record attendance");
    } finally {
      setIsSavingAttendance(false);
    }
  }

  async function handleDownload(type) {
    if (downloadType) return;
    setDownloadType(type);

    try {
      const exportQuery = debouncedSearch ? { search: debouncedSearch } : {};
      const response = type === "pdf"
        ? await service.exportPdf(eventId, exportQuery)
        : await service.exportExcel(eventId, exportQuery);
      const extension = type === "pdf" ? "pdf" : "xlsx";
      const fallbackName = `${(event?.eventName || "event").replace(/[^\w.-]+/g, "-").toLowerCase()}-attendance.${extension}`;
      downloadResponseBlob(response, fallbackName);
      toast.success(`${type === "pdf" ? "PDF" : "Excel"} export downloaded`);
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : "Unable to export attendance");
    } finally {
      setDownloadType(null);
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="attendance-heading">
      <div className="flex flex-col gap-4 border-b border-slate-800/70 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">
            {canCheckIn ? "Event-day operations" : "Attendance history"}
          </p>
          <h2 id="attendance-heading" className="mt-2 text-xl font-semibold text-white">
            {canCheckIn ? "Reception and check-in" : "Attendance records"}
          </h2>
        </div>

      </div>

      {canCheckIn ? (
        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <Card className="border-slate-800/70 bg-slate-950/85 p-0">
            <div className="border-b border-slate-800 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div><p className="font-semibold text-white">Ticket reception</p><p className="mt-1 text-sm text-slate-400">{event?.eventName}</p></div>
                <span className="flex items-center gap-2 text-xs font-medium text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" />Live</span>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <Button size="lg" className="w-full" onClick={() => setIsScannerOpen(true)}><Camera className="h-5 w-5" />Scan ticket QR</Button>
              <div className="flex items-center gap-3 text-xs text-slate-600"><span className="h-px flex-1 bg-slate-800" /><Keyboard className="h-4 w-4" /><span className="h-px flex-1 bg-slate-800" /></div>
              <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={(submitEvent) => { submitEvent.preventDefault(); validateTicket(ticketCode).catch(() => {}); }}>
                <Input label="Ticket reference" value={ticketCode} onChange={(inputEvent) => { setTicketCode(inputEvent.target.value); setTicketPayload(null); setTicketResult(null); }} placeholder="tkt_..." autoComplete="off" spellCheck="false" disabled={isValidatingTicket || isCheckingInTicket} />
                <div className="flex items-end"><Button type="submit" variant="secondary" className="w-full sm:w-auto" isLoading={isValidatingTicket} disabled={isCheckingInTicket}><ScanLine className="h-4 w-4" />Validate</Button></div>
              </form>
              <TicketResult result={ticketResult} eventName={event?.eventName} canCheckIn={canCheckIn} isCheckingIn={isCheckingInTicket} onCheckIn={handleTicketCheckIn} onReset={resetTicketStation} onRetry={() => validateTicket(ticketCode, ticketPayload?.token ? "scan" : "manual").catch(() => {})} />
              <div className="flex justify-end border-t border-slate-800 pt-4"><Button variant="ghost" size="sm" onClick={openManualCheckIn}><UserPlus className="h-4 w-4" />Record walk-in</Button></div>
            </div>
          </Card>

          <div className="space-y-5">
            <AttendanceSummary isLoading={isLiveLoading} totalAttendees={totalAttendees} attendancePercentage={attendancePercentage} lastSyncedAt={lastSyncedAt} />
            <Card className="border-slate-800/70 bg-slate-950/85 p-0">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4 sm:px-5"><div><p className="font-semibold text-white">Recent check-ins</p><p className="mt-1 text-xs text-slate-500">Newest first</p></div><RefreshCw className="h-4 w-4 text-slate-500" /></div>
              {isLiveLoading && recentCheckIns.length === 0 ? <div>{Array.from({ length: 3 }).map((_, index) => <AttendanceRowSkeleton key={`recent-skeleton-${index}`} />)}</div> : recentCheckIns.length > 0 ? <div>{recentCheckIns.map((record) => <AttendanceCard key={record.id || `${record.email}-${record.checkedInAt}`} attendance={record} compact />)}</div> : <div className="px-5 py-10 text-center text-sm text-slate-500">No check-ins recorded</div>}
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <AttendanceSummary isLoading={isLiveLoading} totalAttendees={totalAttendees} attendancePercentage={attendancePercentage} lastSyncedAt={lastSyncedAt} />
          <div className="flex items-start gap-3 border border-amber-500/20 bg-amber-500/10 p-4"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><div><p className="text-sm font-semibold text-amber-100">Check-in is closed</p><p className="mt-1 text-sm text-amber-50/70">This event is {String(event?.status || "inactive").toLowerCase()}.</p></div></div>
        </div>
      )}

      <Card className="border-slate-800/70 bg-slate-950/85 p-0">
        <div className="border-b border-slate-800 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="font-semibold text-white">Attendance list</p><p className="mt-1 text-xs text-slate-500">{formatNumber(pagination?.totalItems || 0)} matching records</p></div>
            <SearchInput label="Search attendance" value={searchValue} onChange={(searchEvent) => setSearchValue(searchEvent.target.value)} placeholder="Name, email, phone, or ticket reference" className="w-full lg:max-w-md" />
          </div>
        </div>

        {isLoading && attendance.length === 0 ? (
          <div>{Array.from({ length: 4 }).map((_, index) => <AttendanceRowSkeleton key={`attendance-skeleton-${index}`} />)}</div>
        ) : error && attendance.length === 0 ? (
          <div className="space-y-3 px-5 py-10 text-center">
            <p className="font-semibold text-white">Unable to load attendance</p>
            <p className="text-sm text-slate-400">{error}</p>
            <Button variant="secondary" size="sm" onClick={refreshAll}>Try again</Button>
          </div>
        ) : attendance.length > 0 ? (
          <div>{attendance.map((record) => <AttendanceCard key={record.id || `${record.email}-${record.checkedInAt}`} attendance={record} />)}</div>
        ) : (
          <div className="px-5 py-10 text-center"><p className="font-semibold text-white">No attendance records</p><p className="mt-2 text-sm text-slate-400">No check-ins match the current search.</p></div>
        )}

        {pagination?.totalPages > 1 ? <div className="border-t border-slate-800 p-4"><Pagination page={pagination.page || 1} totalPages={pagination.totalPages || 1} totalItems={pagination.totalItems || 0} onPageChange={setQueryPage} /></div> : null}
      </Card>

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800/70 pt-4">
        <Button variant="secondary" size="sm" onClick={refreshAll} isLoading={isRefreshing}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
        <Button variant="secondary" size="sm" onClick={() => handleDownload("pdf")} isLoading={downloadType === "pdf"}>
          <FileText className="h-4 w-4" /> Export PDF
        </Button>
        <Button variant="secondary" size="sm" onClick={() => handleDownload("excel")} isLoading={downloadType === "excel"}>
          <FileSpreadsheet className="h-4 w-4" /> Export Excel
        </Button>
      </div>

      <TicketScannerModal open={isScannerOpen} onClose={() => setIsScannerOpen(false)} onDetected={handleScannedTicket} />

      <Modal open={isManualCheckInOpen} title="Record walk-in" onClose={() => setIsManualCheckInOpen(false)} className="max-w-lg" footer={<div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setIsManualCheckInOpen(false)} disabled={isSavingAttendance}>Cancel</Button><Button onClick={handleManualCheckIn} isLoading={isSavingAttendance} loadingText="Saving...">Save attendance</Button></div>}>
        <form className="space-y-4" onSubmit={handleManualCheckIn}>
          <Input label="Full name" value={formValues.name} onChange={(inputEvent) => updateField("name", inputEvent.target.value)} error={formErrors.name} />
          <Input label="Phone number" value={formValues.phone} onChange={(inputEvent) => updateField("phone", inputEvent.target.value)} error={formErrors.phone} />
          <Input label="Email address" type="email" value={formValues.email} onChange={(inputEvent) => updateField("email", inputEvent.target.value)} error={formErrors.email} />
        </form>
      </Modal>
    </section>
  );
}

export default EventAttendancePanel;
