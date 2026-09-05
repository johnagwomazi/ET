import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import ConfirmationDialog from "../dashboard/ConfirmationDialog";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import SearchInput from "../dashboard/SearchInput";
import Pagination from "../dashboard/Pagination";
import StatusBadge from "../dashboard/StatusBadge";
import Avatar from "../dashboard/Avatar";
import { Skeleton, SkeletonText } from "../common/Skeleton";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatDateTime, formatNumber } from "../../utils/formatters";
import { getOrganizationMemberDisplayName } from "../../utils/organizationMemberActions";
import * as eventService from "../../services/event.service";
import * as organizationService from "../../services/organization.service";

const MANAGER_PAGE_LIMIT = 6;

function getUserId(user) {
  return user?._id || user?.id || null;
}

function ManagerRowSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <SkeletonText className="h-4 w-56" />
          <SkeletonText className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
}

function CandidateRow({
  member,
  onAssign,
  isAssigning,
  assigned,
}) {
  const displayName = getOrganizationMemberDisplayName(member);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-start gap-3">
        <Avatar name={displayName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-white">{displayName}</p>
            <StatusBadge status={member.accountStatus} />
          </div>
          <p className="mt-1 truncate text-sm text-slate-400">{member.email}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{member.role}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => onAssign(member)} isLoading={isAssigning}>
          {assigned ? "Assigned" : "Assign"}
        </Button>
      </div>
    </div>
  );
}

function EventManagersPanel({ event, canManageManagers = false }) {
  const eventId = event?._id || event?.id || null;
  const [managers, setManagers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateMembers, setCandidateMembers] = useState([]);
  const [candidatePagination, setCandidatePagination] = useState(null);
  const [candidatePage, setCandidatePage] = useState(1);
  const [isCandidatesLoading, setIsCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState(null);
  const [assigningUserId, setAssigningUserId] = useState(null);
  const [managerToRemove, setManagerToRemove] = useState(null);
  const [isRemovingManager, setIsRemovingManager] = useState(false);
  const managersControllerRef = useRef(null);
  const candidatesControllerRef = useRef(null);

  const debouncedCandidateSearch = useDebouncedValue(candidateSearch, 300);
  const currentManagerIds = useMemo(
    () => new Set(managers.map((assignment) => String(assignment.user?.id || assignment.user?._id || ""))),
    [managers]
  );

  async function loadManagers() {
    if (!eventId || !canManageManagers) {
      setManagers([]);
      setPagination(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    managersControllerRef.current?.abort();
    const controller = new AbortController();
    managersControllerRef.current = controller;

    try {
      const response = await eventService.getOrganizationEventManagers(eventId, {
        page: 1,
        limit: 100,
      }, { signal: controller.signal });

      if (controller.signal.aborted) return null;

      setManagers(response?.managers || []);
      setPagination(response?.pagination || null);
      return response;
    } catch (loadError) {
      if (controller.signal.aborted) return null;
      const message = loadError instanceof Error ? loadError.message : "Unable to load managers";
      setError(message);
      throw loadError;
    } finally {
      if (managersControllerRef.current === controller) {
        managersControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }

  async function loadCandidates({ page = candidatePage, search = debouncedCandidateSearch } = {}) {
    if (!isAssignOpen || !canManageManagers) {
      setCandidateMembers([]);
      setCandidatePagination(null);
      return null;
    }

    setIsCandidatesLoading(true);
    setCandidatesError(null);
    candidatesControllerRef.current?.abort();
    const controller = new AbortController();
    candidatesControllerRef.current = controller;

    try {
      const response = await organizationService.getOrganizationMembers(
        {
          search,
          role: "MANAGER",
          status: "ACTIVE",
          page,
          limit: MANAGER_PAGE_LIMIT,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        { signal: controller.signal }
      );

      if (controller.signal.aborted) return null;

      const members = (response?.members || []).filter((member) => !currentManagerIds.has(String(member.id || member._id || "")));

      setCandidateMembers(members);
      setCandidatePagination(response?.pagination || null);
      return response;
    } catch (loadError) {
      if (controller.signal.aborted) return null;
      const message = loadError instanceof Error ? loadError.message : "Unable to load manager candidates";
      setCandidatesError(message);
      throw loadError;
    } finally {
      if (candidatesControllerRef.current === controller) {
        candidatesControllerRef.current = null;
        setIsCandidatesLoading(false);
      }
    }
  }

  useEffect(() => {
    loadManagers().catch(() => {});

    return () => managersControllerRef.current?.abort();
  }, [canManageManagers, eventId]);

  useEffect(() => {
    if (!isAssignOpen) {
      return;
    }

    setCandidatePage(1);
  }, [debouncedCandidateSearch, isAssignOpen]);

  useEffect(() => {
    if (!isAssignOpen) {
      return undefined;
    }

    loadCandidates({ page: candidatePage, search: debouncedCandidateSearch }).catch(() => {});
    return () => candidatesControllerRef.current?.abort();
  }, [candidatePage, debouncedCandidateSearch, eventId, isAssignOpen]);

  function openAssignModal() {
    setCandidateSearch("");
    setCandidatePage(1);
    setIsAssignOpen(true);
  }

  function closeAssignModal() {
    setIsAssignOpen(false);
    setCandidatesError(null);
    setCandidateSearch("");
    setCandidatePage(1);
  }

  function openRemoveConfirm(manager) {
    setManagerToRemove(manager);
  }

  function closeRemoveConfirm() {
    setManagerToRemove(null);
  }

  async function handleAssignManager(member) {
    if (!member || assigningUserId) {
      return;
    }

    const memberId = getUserId(member);

    if (!memberId) {
      return;
    }

    setAssigningUserId(memberId);

    try {
      await eventService.assignOrganizationEventManager(eventId, { userId: memberId });
      toast.success("Manager assigned successfully");
      await loadManagers().catch(() => {});
      await loadCandidates({ page: candidatePage, search: debouncedCandidateSearch }).catch(() => {});
    } catch (assignError) {
      const message = assignError instanceof Error ? assignError.message : "Unable to assign manager";
      toast.error(message);
    } finally {
      setAssigningUserId(null);
    }
  }

  async function handleRemoveManager() {
    if (!managerToRemove || isRemovingManager) {
      return;
    }

    const userId = getUserId(managerToRemove.user);

    if (!userId) {
      return;
    }

    setIsRemovingManager(true);

    try {
      await eventService.removeOrganizationEventManager(eventId, userId);
      toast.success("Manager removed successfully");
      closeRemoveConfirm();
      await loadManagers().catch(() => {});
      await loadCandidates({ page: candidatePage, search: debouncedCandidateSearch }).catch(() => {});
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : "Unable to remove manager";
      toast.error(message);
    } finally {
      setIsRemovingManager(false);
    }
  }

  if (!canManageManagers) {
    return null;
  }

  return (
    <Card className="border-slate-800/70 bg-slate-950/85">
      <div className="flex flex-col gap-4 border-b border-slate-800/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">Managers</p>
          <h3 className="text-lg font-semibold text-white">Event manager assignments</h3>
          <p className="text-sm leading-6 text-slate-400">
            Assign active organization managers to this event and review the current roster.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => loadManagers().catch(() => {})} isLoading={isLoading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={openAssignModal}>
            <Plus className="h-4 w-4" />
            Assign manager
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {isLoading && managers.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <ManagerRowSkeleton key={`manager-skeleton-${index}`} />
            ))}
          </div>
        ) : error && managers.length === 0 ? (
          <ErrorState
            title="Unable to load managers"
            message={error}
            onRetry={() => {
              loadManagers().catch(() => {});
            }}
          />
        ) : managers.length > 0 ? (
          <div className="grid gap-3">
            {managers.map((assignment) => {
              const manager = assignment.user || {};
              const managerId = getUserId(manager);

              return (
                <div key={assignment.id || managerId || `${assignment.assignedAt}-${assignment.assignedBy?.id || ""}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar name={getOrganizationMemberDisplayName(manager)} size="md" />
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-white">{getOrganizationMemberDisplayName(manager)}</p>
                          <StatusBadge status={manager.accountStatus} />
                        </div>
                        <p className="truncate text-sm text-slate-400">{manager.email}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1">
                            Assigned at {formatDateTime(assignment.assignedAt)}
                          </span>
                          <span className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1">
                            Assigned by {getOrganizationMemberDisplayName(assignment.assignedBy)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button variant="secondary" size="sm" onClick={() => openRemoveConfirm(assignment)} disabled={!managerId}>
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No managers assigned"
            message="Assign an active organization manager to give them event-level oversight."
          />
        )}

        {pagination?.totalItems ? (
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Showing {formatNumber(managers.length)} of {formatNumber(pagination.totalItems)} managers
          </p>
        ) : null}
      </div>

      <Modal
        open={isAssignOpen}
        title="Assign manager"
        onClose={closeAssignModal}
        className="max-w-3xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={closeAssignModal}>
              Close
            </Button>
            <Button variant="secondary" onClick={() => loadCandidates({ page: candidatePage }).catch(() => {})} isLoading={isCandidatesLoading}>
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <SearchInput
            label="Find managers"
            value={candidateSearch}
            onChange={(event) => setCandidateSearch(event.target.value)}
            placeholder="Search active managers..."
          />

          {isCandidatesLoading && candidateMembers.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <ManagerRowSkeleton key={`candidate-skeleton-${index}`} />
              ))}
            </div>
          ) : candidatesError && candidateMembers.length === 0 ? (
            <ErrorState
              title="Unable to load candidates"
              message={candidatesError}
              onRetry={() => {
                loadCandidates({ page: candidatePage, search: debouncedCandidateSearch }).catch(() => {});
              }}
            />
          ) : candidateMembers.length > 0 ? (
            <div className="space-y-3">
              {candidateMembers.map((member) => {
                const memberId = getUserId(member);

                return (
                  <CandidateRow
                    key={memberId || member.email}
                    member={member}
                    assigned={currentManagerIds.has(String(memberId))}
                    isAssigning={assigningUserId === memberId}
                    onAssign={handleAssignManager}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No assignable managers found"
              message="Try a different search term or verify the member is active and has the manager role."
            />
          )}

          {candidatePagination?.totalPages > 1 ? (
            <Pagination
              page={candidatePagination.page || 1}
              totalPages={candidatePagination.totalPages || 1}
              totalItems={candidatePagination.totalItems || 0}
              onPageChange={(nextPage) => setCandidatePage(nextPage)}
            />
          ) : null}
        </div>
      </Modal>

      <ConfirmationDialog
        open={Boolean(managerToRemove)}
        title="Remove manager"
        message={
          managerToRemove
            ? `Remove ${getOrganizationMemberDisplayName(managerToRemove.user)} from this event? Their access will be revoked.`
            : undefined
        }
        confirmText="Remove"
        tone="danger"
        isLoading={isRemovingManager}
        onCancel={closeRemoveConfirm}
        onConfirm={handleRemoveManager}
      />
    </Card>
  );
}

export default EventManagersPanel;
