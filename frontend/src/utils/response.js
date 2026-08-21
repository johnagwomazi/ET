export function unwrapResponse(response) {
  if (!response || typeof response !== "object") {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(response, "data")) {
    return response.data;
  }

  return response;
}
