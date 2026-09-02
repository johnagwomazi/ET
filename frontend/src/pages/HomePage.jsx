import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import PageContainer from "../components/ui/PageContainer";
import FilterSelect from "../components/dashboard/FilterSelect";
import SearchInput from "../components/dashboard/SearchInput";
import SectionHeader from "../components/dashboard/SectionHeader";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import Pagination from "../components/dashboard/Pagination";
import { Skeleton } from "../components/common/Skeleton";
import PublicEventCard, { PublicEventCardSkeleton } from "../components/events/PublicEventCard";
import { formatDate } from "../utils/formatters";
import { discoverPublicEvents } from "../services/publicEvent.service";
import heroImage from "../assets/images/01.jpg";

const DEFAULT_LIMIT = 12;
const SORT_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "newest", label: "Newest" },
  { value: "dateAsc", label: "Date: Earliest" },
  { value: "dateDesc", label: "Date: Latest" },
  { value: "featured", label: "Featured" },
  { value: "trending", label: "Trending" },
];

function normalizeCategory(value) {
  return typeof value === "string" ? value.trim() : "";
}

function collectCategories(...groups) {
  const seen = new Map();

  groups.flat().forEach((item) => {
    const category = normalizeCategory(typeof item === "string" ? item : item?.category);

    if (!category || seen.has(category.toLowerCase())) {
      return;
    }

    seen.set(category.toLowerCase(), category);
  });

  return Array.from(seen.values()).sort((left, right) => left.localeCompare(right));
}

function dedupeEvents(events = []) {
  const seen = new Set();

  return events.filter((event) => {
    const id = event?.id;

    if (!id || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}

function formatTime(value) {
  if (!value) {
    return "TBA";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "TBA";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function HomePage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("upcoming");
  const [page, setPage] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);
  const [events, setEvents] = useState([]);
  const [popularEvents, setPopularEvents] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    totalItems: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const shouldShowInitialLoading = isLoading && events.length === 0 && popularEvents.length === 0;

    async function loadEvents() {
      if (shouldShowInitialLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setError(null);

      try {
        const response = await discoverPublicEvents(
          {
            page,
            limit: DEFAULT_LIMIT,
            search: search || undefined,
            category: category || undefined,
            sort,
          },
          { signal }
        );

        const nextEvents = Array.isArray(response?.events) ? response.events : [];
        const nextPopular = dedupeEvents([
          ...(Array.isArray(response?.featuredEvents) ? response.featuredEvents : []),
          ...(Array.isArray(response?.trendingEvents) ? response.trendingEvents : []),
        ]).slice(0, 3);

        setEvents(nextEvents);
        setPopularEvents(nextPopular);
        setCategoryOptions((current) => collectCategories(current, nextEvents, response?.featuredEvents, response?.trendingEvents));
        setPagination(
          response?.pagination || {
            page,
            limit: DEFAULT_LIMIT,
            totalItems: nextEvents.length,
            totalPages: nextEvents.length > 0 ? 1 : 0,
          }
        );
      } catch (loadError) {
        if (signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load events");
        setEvents([]);
        setPopularEvents([]);
        setPagination({ page, limit: DEFAULT_LIMIT, totalItems: 0, totalPages: 0 });
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    loadEvents().catch(() => {});

    return () => controller.abort();
  }, [page, search, category, sort, refreshTick]);

  const categorySelectOptions = useMemo(
    () => [
      { value: "", label: "All Categories" },
      ...categoryOptions.map((item) => ({ value: item, label: item })),
    ],
    [categoryOptions]
  );

  const hasActiveFilters = Boolean(search || category || (sort && sort !== "upcoming") || page > 1);
  const showDiscoverySkeleton = isLoading || isRefreshing;
  const showPopularSkeleton = isLoading && popularEvents.length === 0;
  const isEmpty = !showDiscoverySkeleton && !error && events.length === 0;
  const heroTagline = search || category ? "Refine your discovery" : "Discover public events in one place";

  function handleSearchSubmit(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleClearFilters() {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setSort("upcoming");
    setPage(1);
  }

  function handleCategoryChange(event) {
    setCategory(event.target.value);
    setPage(1);
  }

  function handleSortChange(event) {
    setSort(event.target.value);
    setPage(1);
  }

  return (
      <main className="space-y-10 pb-10">
        <PageContainer className="pt-6 sm:pt-8">
          <motion.section
            id="hero"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/85"
          >
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} />
            <div className="absolute inset-0 bg-black/50" />

            <div className="relative px-6 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
              <div className="max-w-2xl space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-xs font-medium text-slate-300">
                  <Sparkles className="h-3.5 w-3.5 text-app-300" />
                  {heroTagline}
                </span>

                <div className="space-y-4">
                  <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                    Discover your next event.
                  </h1>
                  <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                    Search public events, browse featured picks, and filter by category without leaving the
                    application shell.
                  </p>
                </div>

                <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
                  <SearchInput
                    label="Search events"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search event name, venue, city, or category"
                    className="flex-1"
                  />
                  <div className="flex gap-2 sm:pt-7">
                    <Button type="submit">
                      <Search className="h-4 w-4" />
                      Search
                    </Button>
                    {hasActiveFilters ? (
                      <Button type="button" variant="secondary" onClick={handleClearFilters}>
                        Clear
                      </Button>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>
          </motion.section>
        </PageContainer>

        <div id="categories">
          <PageContainer>
            <Card className="space-y-4">
              <SectionHeader
                eyebrow="Category"
                title="Filter by category"
                description="Choose one category to narrow the public discovery feed."
              />
              <div className="max-w-xl">
                <FilterSelect
                  label="Category"
                  value={category}
                  onChange={handleCategoryChange}
                  options={categorySelectOptions}
                />
              </div>
            </Card>
          </PageContainer>
        </div>

        <div id="popular-events">
          <PageContainer className="space-y-4">
            <SectionHeader
              eyebrow="Popular events"
              title="Popular Events"
              description="A compact selection of spotlighted public events from the backend."
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {showPopularSkeleton
                ? Array.from({ length: 3 }).map((_, index) => <PublicEventCardSkeleton key={`popular-skeleton-${index}`} />)
                : popularEvents.map((event) => <PublicEventCard key={event.id} event={event} spotlight />)}
            </div>
          </PageContainer>
        </div>

        <div id="all-events">
          <PageContainer className="space-y-4">
            <SectionHeader
              eyebrow="Discovery results"
              title="All Events"
              description="Search, filter, and browse the complete public event list returned by the backend."
              actions={[
                {
                  label: "Reset filters",
                  variant: "secondary",
                  onClick: handleClearFilters,
                },
              ]}
            />

            <Card className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-sm text-slate-400">
                    {showDiscoverySkeleton
                      ? "Loading public events..."
                      : `${pagination.totalItems || events.length || 0} events found`}
                  </p>
                  {search || category ? (
                    <p className="mt-2 text-sm text-slate-500">
                      {search ? `Search: "${search}"` : null}
                      {search && category ? " | " : null}
                      {category ? `Category: ${category}` : null}
                    </p>
                  ) : null}
                </div>

                <FilterSelect label="Sort" value={sort} onChange={handleSortChange} options={SORT_OPTIONS} />
              </div>

              {error ? (
                <ErrorState
                  title="Unable to load events"
                  message="The discovery feed could not be loaded right now."
                  onRetry={() => setRefreshTick((current) => current + 1)}
                />
              ) : null}

              {!error && showDiscoverySkeleton ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <PublicEventCardSkeleton key={`events-skeleton-${index}`} />
                  ))}
                </div>
              ) : null}

              {!error && !showDiscoverySkeleton && isEmpty ? (
                <EmptyState
                  title="No Events found"
                  message={
                    hasActiveFilters
                      ? "No events match your current search or filter settings."
                      : "No public events are available yet."
                  }
                />
              ) : null}

              {!error && !showDiscoverySkeleton && events.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {events.map((event) => (
                    <PublicEventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : null}

              {!error && !showDiscoverySkeleton && pagination.totalPages > 1 ? (
                <Pagination
                  page={pagination.page || page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.totalItems}
                  onPageChange={setPage}
                />
              ) : null}
            </Card>
          </PageContainer>
        </div>

      </main>
  );
}

export default HomePage;
