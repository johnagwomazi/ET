import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAMES } from "../constants/auth.constants.js";
import envConfig from "../config/env.config.js";
import * as authService from "../services/auth.service.js";
import * as adminDashboardService from "../services/adminDashboard.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(AUTH_COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    httpOnly: envConfig.cookieHttpOnly,
    secure: envConfig.cookieSecure,
    sameSite: envConfig.cookieSameSite,
    maxAge: AUTH_COOKIE_MAX_AGE_MS.ACCESS_TOKEN,
    path: "/",
  });

  res.cookie(AUTH_COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    httpOnly: envConfig.cookieHttpOnly,
    secure: envConfig.cookieSecure,
    sameSite: envConfig.cookieSameSite,
    maxAge: AUTH_COOKIE_MAX_AGE_MS.REFRESH_TOKEN,
    path: "/",
  });
}

export async function login(req, res) {
  try {
    const result = await authService.loginSuperAdmin(req.body);

    if (result.error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse(result.error));
    }

    setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.status(HTTP_STATUS.OK).json(
      successResponse("Operation successful", {
        user: result.user,
      })
    );
  } catch (error) {
    console.log(error);
    console.log("error in admin controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getDashboardOverview(req, res) {
  try {
    const result = await adminDashboardService.getDashboardOverview();

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in admin controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}
