const ACCESS_TOKEN_STORAGE_KEY = "events_access_token";

export function clearStoredAccessToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}
