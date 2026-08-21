export const AUTH_COOKIE_NAMES = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
};

export const AUTH_TOKEN_EXPIRES_IN = {
  ACCESS_TOKEN: "15m",
  REFRESH_TOKEN: "7d",
  EMAIL_VERIFICATION: "24h",
  PASSWORD_RESET: "15m",
};

export const AUTH_COOKIE_MAX_AGE_MS = {
  ACCESS_TOKEN: 15 * 60 * 1000,
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000,
};

export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
};
