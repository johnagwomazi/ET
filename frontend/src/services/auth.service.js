import { get, patch, post } from "../api/httpClient";
import { unwrapResponse } from "../utils/response";

function extractData(response) {
  return unwrapResponse(response);
}

export async function registerCustomer(payload) {
  const response = await post("/auth/register/customer", payload);
  return extractData(response);
}

export async function registerOrganizer(payload) {
  const response = await post("/auth/register/organizer", payload);
  return extractData(response);
}

export async function login(payload) {
  const response = await post("/auth/login", payload, { skipAuthRefresh: true });
  return extractData(response);
}

export async function adminLogin(payload) {
  const response = await post("/admin/login", payload, { skipAuthRefresh: true });
  return extractData(response);
}

export async function getCurrentUser() {
  const response = await get("/auth/me");
  return extractData(response);
}

export async function logout() {
  const response = await post("/auth/logout", {}, { notifyOnAuthFailure: false });
  return extractData(response);
}

export async function verifyEmail(payload) {
  const response = await post("/auth/verify-email", payload);
  return extractData(response);
}

export async function forgotPassword(payload) {
  const response = await post("/auth/forgot-password", payload);
  return extractData(response);
}

export async function resetPassword(payload) {
  const response = await post("/auth/reset-password", payload);
  return extractData(response);
}

export async function changePassword(payload) {
  const response = await patch("/auth/change-password", payload);
  return extractData(response);
}
