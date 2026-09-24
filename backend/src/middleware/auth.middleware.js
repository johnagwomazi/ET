import jwt from "jsonwebtoken";
import envConfig from "../config/env.config.js";
import { AUTH_COOKIE_NAMES } from "../constants/auth.constants.js";
import { ACCOUNT_STATUS } from "../constants/accountStatus.constants.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { errorResponse } from "../utils/apiResponse.js";
import { findAuthUserById } from "../repositories/auth.repository.js";

function getAccessToken(req) {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAMES.ACCESS_TOKEN];
  if (cookieToken) return cookieToken;

  const authorizationHeader = req.headers.authorization;

  if (authorizationHeader && authorizationHeader.startsWith("Bearer ")) {
    return authorizationHeader.split(" ")[1];
  }

  return null;
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

function tokenPredatesPasswordChange(user, decodedToken) {
  if (!user?.passwordChangedAt || !decodedToken?.iat) return false;
  return Math.floor(new Date(user.passwordChangedAt).getTime() / 1000) > decodedToken.iat;
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

        if (tokenPredatesPasswordChange(user, decodedToken)) {
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
        return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
      }
    }

    return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
  }
}
