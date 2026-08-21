import { get, patch, post } from "../api/httpClient";
import { unwrapResponse } from "../utils/response";

function extractData(response) {
  return unwrapResponse(response);
}

export async function registerCustomer(payload) {
  try {
    const response = await post("/auth/register/customer", payload);
    return extractData(response);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function registerOrganizer(payload) {
  try {
    const response = await post("/auth/register/organizer", payload);
    return extractData(response);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function login(payload) {
  try {
    const response = await post("/auth/login", payload);
    return extractData(response);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function adminLogin(payload) {
  try {
    const response = await post("/admin/login", payload);
    return extractData(response);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getCurrentUser() {
  try {
    const response = await get("/auth/me");
    return extractData(response);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function logout() {
  try {
    const response = await post("/auth/logout", {});
    return extractData(response);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function verifyEmail(payload) {
  try {
    const response = await post("/auth/verify-email", payload);
    return extractData(response);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function forgotPassword(payload) {
  try {
    const response = await post("/auth/forgot-password", payload);
    return extractData(response);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function resetPassword(payload) {
  try {
    const response = await post("/auth/reset-password", payload);
    return extractData(response);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function changePassword(payload) {
  try {
    const response = await patch("/auth/change-password", payload);
    return extractData(response);
  } catch (error) {
    console.log(error);
    throw error;
  }
}
