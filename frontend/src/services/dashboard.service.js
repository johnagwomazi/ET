import { get } from "../api/httpClient";
import { unwrapResponse } from "../utils/response";

export async function getDashboardOverview() {
  const response = await get("/admin/dashboard/overview");

  return unwrapResponse(response);
}
