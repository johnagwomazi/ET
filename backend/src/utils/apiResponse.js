export function successResponse(message, data = null) {
  const response = {
    success: true,
    message,
  };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  return response;
}

export function errorResponse(message, data = null) {
  const response = {
    success: false,
    message,
  };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  return response;
}
