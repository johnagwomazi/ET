const configuredApiUrl = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

function validateApiUrl(value) {
  if (!value) {
    if (import.meta.env.PROD) {
      throw new Error("VITE_API_URL is required for a production build");
    }
    return;
  }

  let url;
  try {
    url = new URL(value);
  } catch (error) {
    throw new Error("VITE_API_URL must be a valid HTTP(S) URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("VITE_API_URL must be a valid HTTP(S) URL");
  }

  if (import.meta.env.PROD && ["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("VITE_API_URL cannot use a local address in a production build");
  }
}

validateApiUrl(configuredApiUrl);

export const APP_NAME = import.meta.env.VITE_APP_NAME || "Events";
export const APP_ENV = import.meta.env.MODE;
export const API_URL = configuredApiUrl;
