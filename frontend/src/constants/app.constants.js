const configuredApiUrl = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
const configuredBackendOrigin = String(import.meta.env.VITE_BACKEND_ORIGIN || "").trim().replace(/\/$/, "");

function isRootRelativeUrl(value) {
  return value.startsWith("/") && !value.startsWith("//");
}

function validateHttpUrl(value, variableName, { allowRootRelative = false } = {}) {
  if (!value) {
    if (import.meta.env.PROD) {
      throw new Error(`${variableName} is required for a production build`);
    }
    return;
  }

  if (allowRootRelative && isRootRelativeUrl(value)) return;

  let url;
  try {
    url = new URL(value);
  } catch (error) {
    const acceptedValue = allowRootRelative ? "a valid HTTP(S) URL or root-relative path" : "a valid HTTP(S) URL";
    throw new Error(`${variableName} must be ${acceptedValue}`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${variableName} must be a valid HTTP(S) URL`);
  }

  if (import.meta.env.PROD && ["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error(`${variableName} cannot use a local address in a production build`);
  }
}

function getConfiguredBackendOrigin() {
  if (configuredBackendOrigin) {
    return new URL(configuredBackendOrigin).origin;
  }

  if (!configuredApiUrl) return "";

  if (isRootRelativeUrl(configuredApiUrl)) {
    return globalThis.location?.origin || "";
  }

  return new URL(configuredApiUrl).origin;
}

validateHttpUrl(configuredApiUrl, "VITE_API_URL", { allowRootRelative: true });

if (configuredBackendOrigin) {
  validateHttpUrl(configuredBackendOrigin, "VITE_BACKEND_ORIGIN");
}

export const APP_NAME = import.meta.env.VITE_APP_NAME || "Eventidor";
export const APP_ENV = import.meta.env.MODE;
export const API_URL = configuredApiUrl;
export const BACKEND_ORIGIN = getConfiguredBackendOrigin();
