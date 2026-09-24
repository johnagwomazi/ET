import { API_URL } from "../constants/app.constants";

const inFlightGetRequests = new Map();
let refreshSessionPromise = null;
let sessionExpiredHandler = null;

export function setSessionExpiredHandler(handler) {
  sessionExpiredHandler = typeof handler === "function" ? handler : null;
}

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

async function parseResponse(response, responseType = "json") {
  if (responseType === "blob") {
    return response.blob();
  }

  if (responseType === "arrayBuffer") {
    return response.arrayBuffer();
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function buildRequestError(response) {
  const payload = await parseResponse(response, "json").catch(() => null);
  const message =
    payload && typeof payload === "object" && payload.message
      ? payload.message
      : "Something went wrong";
  const requestError = new Error(message);
  requestError.status = response.status;
  requestError.data = payload && typeof payload === "object" ? payload.data || null : null;
  requestError.payload = payload;
  return requestError;
}

function sendRequest(method, path, options = {}) {
  const { body, headers = {}, signal } = options;
  const isFormData = body instanceof FormData;
  const requestHeaders = { ...headers };

  if (!isFormData && body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  return fetch(buildUrl(path), {
    method,
    credentials: "include",
    headers: requestHeaders,
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });
}

async function refreshSession() {
  if (refreshSessionPromise) {
    return refreshSessionPromise;
  }

  refreshSessionPromise = (async () => {
    const response = await sendRequest("POST", "/auth/refresh", { body: {} });

    if (!response.ok) {
      throw await buildRequestError(response);
    }

    return true;
  })();

  try {
    return await refreshSessionPromise;
  } finally {
    refreshSessionPromise = null;
  }
}

function notifySessionExpired() {
  sessionExpiredHandler?.();
}

export async function request(method, path, options = {}) {
  const {
    responseType = "json",
    skipAuthRefresh = false,
    notifyOnAuthFailure = true,
  } = options;

  try {
    let response = await sendRequest(method, path, options);

    if (response.status === 401 && !skipAuthRefresh) {
      try {
        await refreshSession();
      } catch (refreshError) {
        if (refreshError?.status === 401 || refreshError?.status === 403) {
          if (notifyOnAuthFailure) notifySessionExpired();
          const sessionError = new Error("Your session has expired. Sign in to continue.");
          sessionError.status = 401;
          throw sessionError;
        }

        throw refreshError;
      }

      response = await sendRequest(method, path, options);

      if (response.status === 401 && notifyOnAuthFailure) {
        notifySessionExpired();
      }
    }

    if (!response.ok) {
      throw await buildRequestError(response);
    }

    const payload = await parseResponse(response, responseType);

    if (responseType === "blob" || responseType === "arrayBuffer") {
      return {
        body: payload,
        headers: response.headers,
        status: response.status,
      };
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    if (!(error instanceof TypeError)) throw error;

    const networkError = new Error("Unable to reach the server. Check your connection and try again.");
    networkError.status = 0;
    throw networkError;
  }
}

function waitForRequest(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new DOMException("The request was aborted", "AbortError"));

  return new Promise((resolve, reject) => {
    function handleAbort() {
      reject(new DOMException("The request was aborted", "AbortError"));
    }

    signal.addEventListener("abort", handleAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", handleAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", handleAbort);
        reject(error);
      }
    );
  });
}

export function get(path, options = {}) {
  const { signal, ...requestOptions } = options;
  const requestKey = JSON.stringify([path, requestOptions.responseType || "json", requestOptions.headers || {}]);
  let pendingRequest = inFlightGetRequests.get(requestKey);

  if (!pendingRequest) {
    pendingRequest = request("GET", path, requestOptions);
    inFlightGetRequests.set(requestKey, pendingRequest);
    pendingRequest.then(
      () => inFlightGetRequests.delete(requestKey),
      () => inFlightGetRequests.delete(requestKey)
    );
  }

  return waitForRequest(pendingRequest, signal);
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
