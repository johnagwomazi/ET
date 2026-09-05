import envConfig from "../config/env.config.js";
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAMES } from "../constants/auth.constants.js";

function cookieOptions(maxAge) {
  return {
    httpOnly: envConfig.cookieHttpOnly,
    secure: envConfig.cookieSecure,
    sameSite: envConfig.cookieSameSite,
    maxAge,
    path: "/",
  };
}

export function setAccessTokenCookie(res, accessToken) {
  res.cookie(AUTH_COOKIE_NAMES.ACCESS_TOKEN, accessToken, cookieOptions(AUTH_COOKIE_MAX_AGE_MS.ACCESS_TOKEN));
}

export function setAuthCookies(res, accessToken, refreshToken) {
  setAccessTokenCookie(res, accessToken);
  res.cookie(AUTH_COOKIE_NAMES.REFRESH_TOKEN, refreshToken, cookieOptions(AUTH_COOKIE_MAX_AGE_MS.REFRESH_TOKEN));
}

export function clearAuthCookies(res) {
  const options = cookieOptions(undefined);
  delete options.maxAge;
  res.clearCookie(AUTH_COOKIE_NAMES.ACCESS_TOKEN, options);
  res.clearCookie(AUTH_COOKIE_NAMES.REFRESH_TOKEN, options);
}
