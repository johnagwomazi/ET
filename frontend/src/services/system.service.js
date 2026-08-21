import { get } from "../api/httpClient";

export async function getBackendHealth() {
  try {
    return await get("/health");
  } catch (error) {
    console.log(error);
    throw error;
  }
}
