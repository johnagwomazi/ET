import { get } from "../api/httpClient";
import { unwrapResponse } from "../utils/response";
import { getPlatformAnalyticsOverview } from "./analytics.service";

export async function getDashboardOverview() {
  const [response, analytics] = await Promise.all([
    get("/admin/dashboard/overview"),
    getPlatformAnalyticsOverview({
      preset: "all",
      timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
    }),
  ]);

  return { ...unwrapResponse(response), platformAnalytics: analytics };
}
