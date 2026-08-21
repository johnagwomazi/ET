const ACCESS_TOKEN_STORAGE_KEY = "events_access_token";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function getStoredAccessToken() {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  return storage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setStoredAccessToken(token) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  if (token) {
    storage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    return;
  }

  storage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function clearStoredAccessToken() {
  setStoredAccessToken(null);
}
