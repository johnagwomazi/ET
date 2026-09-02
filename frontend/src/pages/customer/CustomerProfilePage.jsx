import { useState } from "react";
import toast from "react-hot-toast";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
import Avatar from "../../components/dashboard/Avatar";
import StatusBadge from "../../components/dashboard/StatusBadge";
import ErrorState from "../../components/common/ErrorState";
import { Skeleton } from "../../components/common/Skeleton";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import PageContainer from "../../components/ui/PageContainer";
import { useSessionStore } from "../../store/useSessionStore";
import { formatDate } from "../../utils/formatters";

function ProfileInformationSkeleton() {
  return (
    <Card className="border-slate-800/70 bg-slate-950/80" aria-label="Loading profile information">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-4 w-56 rounded-md" />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-lg" />)}
        </div>
      </div>
    </Card>
  );
}

function ProfileField({ label, value }) {
  return (
    <div className="border-b border-slate-800 pb-4">
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-2 break-words text-sm font-medium text-white">{value}</dd>
    </div>
  );
}

function CustomerProfilePage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const refreshCurrentUser = useSessionStore((state) => state.refreshCurrentUser);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const fullName = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim();

  async function handleRefresh() {
    setIsRefreshing(true);
    setError(null);

    try {
      await refreshCurrentUser();
      toast.success("Profile refreshed");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh your profile");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <main className="py-10 sm:py-14">
      <PageContainer className="space-y-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-app-300">Account</p>
            <h1 className="text-3xl font-semibold text-white">My Profile</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-400">Review the personal information attached to your customer account.</p>
          </div>
          <Button variant="secondary" onClick={handleRefresh} isLoading={isRefreshing} loadingText="Refreshing...">Refresh</Button>
        </header>

        {error ? <ErrorState title="Unable to refresh profile" message={error} onRetry={handleRefresh} /> : null}

        {isRefreshing ? (
          <ProfileInformationSkeleton />
        ) : (
          <Card className="border-slate-800/70 bg-slate-950/80">
            <div className="space-y-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar name={fullName || currentUser?.email} size="lg" />
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold text-white">{fullName || "Customer"}</h2>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{currentUser?.email || "Email unavailable"}</span>
                  </p>
                </div>
              </div>

              <section className="space-y-5" aria-label="Personal information">
                <div className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-app-300" />
                  <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                </div>
                <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  <ProfileField label="First name" value={currentUser?.firstName || "Not provided"} />
                  <ProfileField label="Last name" value={currentUser?.lastName || "Not provided"} />
                  <ProfileField label="Full name" value={fullName || "Not provided"} />
                  <ProfileField label="Email" value={currentUser?.email || "Not provided"} />
                  {currentUser?.createdAt ? <ProfileField label="Member since" value={formatDate(currentUser.createdAt)} /> : null}
                </dl>
              </section>

              <section className="space-y-4 border-t border-slate-800 pt-6" aria-label="Account status">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-app-300" />
                  <h2 className="text-lg font-semibold text-white">Account Status</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  {currentUser?.accountStatus ? <StatusBadge status={currentUser.accountStatus} /> : null}
                  {typeof currentUser?.isEmailVerified === "boolean" ? (
                    <StatusBadge
                      status={currentUser.isEmailVerified ? "ACTIVE" : "PENDING_VERIFICATION"}
                      label={currentUser.isEmailVerified ? "Email verified" : "Email verification pending"}
                    />
                  ) : null}
                </div>
              </section>
            </div>
          </Card>
        )}
      </PageContainer>
    </main>
  );
}

export default CustomerProfilePage;
