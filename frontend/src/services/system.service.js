import { get } from "../api/httpClient";

export async function getBackendHealth() {
  return get("/health");
}
