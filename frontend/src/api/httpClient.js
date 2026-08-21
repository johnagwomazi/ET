import { API_URL } from "../constants/app.constants";

function buildUrl(path) {
  if (!path) {
    return API_URL;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedBaseUrl = API_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function request(method, path, options = {}) {
  try {
    const { body, headers = {}, signal } = options;
    const isFormData = body instanceof FormData;
    const requestHeaders = {
      ...headers,
    };

    if (!isFormData && body !== undefined) {
      requestHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(buildUrl(path), {
      method,
      credentials: "include",
      headers: requestHeaders,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && payload.message
          ? payload.message
          : "Something went wrong";

      throw new Error(message);
    }

    return payload;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export function get(path, options) {
  return request("GET", path, options);
}

export function post(path, body, options = {}) {
  return request("POST", path, { ...options, body });
}

export function put(path, body, options = {}) {
  return request("PUT", path, { ...options, body });
}

export function patch(path, body, options = {}) {
  return request("PATCH", path, { ...options, body });
}

export function remove(path, options = {}) {
  return request("DELETE", path, options);
}
