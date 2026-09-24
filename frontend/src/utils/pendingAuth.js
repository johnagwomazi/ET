const VERIFICATION_KEY = "events_email_verification";
const GOOGLE_KEY = "events_google_registration";

function read(key) {
  try {
    return JSON.parse(window.sessionStorage.getItem(key) || "null");
  } catch (error) {
    return null;
  }
}

function write(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // The query-string fallback still allows verification when storage is unavailable.
  }
}

export function getPendingVerification() {
  return read(VERIFICATION_KEY);
}

export function savePendingVerification(value) {
  write(VERIFICATION_KEY, value);
}

export function clearPendingVerification() {
  try {
    window.sessionStorage.removeItem(VERIFICATION_KEY);
  } catch (error) {
    // Nothing else to clear.
  }
}

export function getPendingGoogleRegistration() {
  return read(GOOGLE_KEY);
}

export function savePendingGoogleRegistration(value) {
  write(GOOGLE_KEY, value);
}

export function clearPendingGoogleRegistration() {
  try {
    window.sessionStorage.removeItem(GOOGLE_KEY);
  } catch (error) {
    // Nothing else to clear.
  }
}
