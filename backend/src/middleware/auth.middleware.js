import jwt from "jsonwebtoken";
import envConfig from "../config/env.config.js";
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAMES } from "../constants/auth.constants.js";
import { ACCOUNT_STATUS } from "../constants/accountStatus.constants.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { errorResponse } from "../utils/apiResponse.js";
import { hashToken } from "../utils/token.util.js";
import { findAuthUserById, findAuthUserByIdWithSecrets } from "../repositories/auth.repository.js";

function getAccessToken(req) {
  const authorizationHeader = req.headers.authorization;

  if (authorizationHeader && authorizationHeader.startsWith("Bearer ")) {
    return authorizationHeader.split(" ")[1];
  }

  return req.cookies?.[AUTH_COOKIE_NAMES.ACCESS_TOKEN] || null;
}

function getRefreshToken(req) {
  return req.cookies?.[AUTH_COOKIE_NAMES.REFRESH_TOKEN] || null;
}

function setAccessTokenCookie(res, accessToken) {
  res.cookie(AUTH_COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    httpOnly: envConfig.cookieHttpOnly,
    secure: envConfig.cookieSecure,
    sameSite: envConfig.cookieSameSite,
    maxAge: AUTH_COOKIE_MAX_AGE_MS.ACCESS_TOKEN,
    path: "/",
  });
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      organizationId: getDocumentId(user.organization),
    },
    envConfig.jwtAccessSecret,
    {
      expiresIn: envConfig.jwtAccessExpiresIn || "15m",
    }
  );
}

function canAuthenticateUser(user) {
  if (!user) {
    return false;
  }

  if (user.isDeleted) {
    return false;
  }

  if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED || user.accountStatus === ACCOUNT_STATUS.INACTIVE) {
    return false;
  }

  return true;
}

function getDocumentId(document) {
  if (!document) {
    return null;
  }

  if (typeof document === "string") {
    return document;
  }

  if (document._id) {
    return document._id.toString();
  }

  return document.toString();
}

export async function protectRoute(req, res, next) {
  try {
    const token = getAccessToken(req);

    if (token) {
      try {
        const decodedToken = jwt.verify(token, envConfig.jwtAccessSecret);
        const user = await findAuthUserById(decodedToken.sub);

        if (!canAuthenticateUser(user)) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
        }

        req.user = user;
        req.auth = {
          userId: user._id.toString(),
          role: user.role,
          organizationId: getDocumentId(user.organization),
        };

        return next();
      } catch (error) {
        // Fall through to refresh-token recovery below.
      }
    }

    const refreshToken = getRefreshToken(req);

    if (!refreshToken) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
    }

    const decodedRefreshToken = jwt.verify(refreshToken, envConfig.jwtRefreshSecret);
    const user = await findAuthUserByIdWithSecrets(decodedRefreshToken.sub);

    if (!canAuthenticateUser(user)) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
    }

    if (!user.refreshTokenHash || user.refreshTokenHash !== hashToken(refreshToken)) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
    }

    const renewedAccessToken = generateAccessToken(user);
    setAccessTokenCookie(res, renewedAccessToken);

    req.user = user;
    req.auth = {
      userId: user._id.toString(),
      role: user.role,
      organizationId: getDocumentId(user.organization),
    };

    return next();
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
  }
}
