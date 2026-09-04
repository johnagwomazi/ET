import { RefreshCw } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import FilterSelect from "../dashboard/FilterSelect";
import {
  ANALYTICS_DATE_PRESETS,
  ANALYTICS_PERIODS,
} from "../../constants/analytics.constants";

function AnalyticsFilters({
  filters,
  onChange,
  onRefresh,
  eventOptions = [],
  showEvent = false,
  showPeriod = true,
  validationError = "",
  isRefreshing = false,
}) {
  return (
    <Card className="border-slate-800/70 bg-slate-950/85 p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 xl:items-end">
        <FilterSelect
          label="Date range"
          value={filters.preset}
          onChange={(event) => onChange({ preset: event.target.value })}
          options={ANALYTICS_DATE_PRESETS}
        />

        {filters.preset === "custom" ? (
          <>
            <Input
              label="Start date"
              type="date"
              value={filters.startDate}
              max={filters.endDate || undefined}
              onChange={(event) => onChange({ startDate: event.target.value })}
            />
            <Input
              label="End date"
              type="date"
              value={filters.endDate}
              min={filters.startDate || undefined}
              onChange={(event) => onChange({ endDate: event.target.value })}
            />
          </>
        ) : null}

        {showEvent ? (
          <FilterSelect
            label="Event"
            value={filters.eventId}
            onChange={(event) => onChange({ eventId: event.target.value })}
            options={[{ value: "", label: "All events" }, ...eventOptions]}
          />
        ) : null}

        {showPeriod ? (
          <FilterSelect
            label="Trend interval"
            value={filters.period}
            onChange={(event) => onChange({ period: event.target.value })}
            options={ANALYTICS_PERIODS}
          />
        ) : null}

        <Button
          variant="secondary"
          onClick={onRefresh}
          isLoading={isRefreshing}
          loadingText="Refreshing..."
          className="w-full sm:w-auto"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {validationError ? <p className="mt-3 text-sm text-amber-300" role="alert">{validationError}</p> : null}
    </Card>
  );
}

export default AnalyticsFilters;

