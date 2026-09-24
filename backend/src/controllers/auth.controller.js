import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { AUTH_COOKIE_NAMES } from "../constants/auth.constants.js";
import * as authService from "../services/auth.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";
import { clearAuthCookies, setAccessTokenCookie, setAuthCookies } from "../utils/authCookie.util.js";

export async function registerCustomer(req, res) {
  try {
    const result = await authService.registerCustomer(req.body);

    if (result.error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse(result.error));
    }

    return res.status(HTTP_STATUS.CREATED).json(
      successResponse("Operation successful", {
        user: result.user,
        requiresEmailVerification: true,
      })
    );
  } catch (error) {
    console.log(error);
    console.log("error in auth controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function registerOrganizer(req, res) {
  try {
    const result = await authService.registerOrganizer(req.body);

    if (result.error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse(result.error));
    }

    return res.status(HTTP_STATUS.CREATED).json(
      successResponse("Operation successful", {
        organization: result.organization,
        user: result.user,
        requiresEmailVerification: true,
      })
    );
  } catch (error) {
    console.log(error);
    console.log("error in auth controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function login(req, res) {
  try {
    const result = await authService.loginUser(req.body);

    if (result.error) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse(result.error));
    }

    setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.status(HTTP_STATUS.OK).json(
      successResponse("Operation successful", {
        user: result.user,
      })
    );
  } catch (error) {
    console.log(error);
    console.log("error in auth controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function refresh(req, res) {
  try {
    const refreshToken = req.cookies?.[AUTH_COOKIE_NAMES.REFRESH_TOKEN] || null;
    const result = await authService.refreshUserSession(refreshToken);

    if (result.error) {
      clearAuthCookies(res);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse(result.error));
    }

    setAccessTokenCookie(res, result.accessToken);
    return res.status(HTTP_STATUS.OK).json(successResponse("Session renewed", {}));
  } catch (error) {
    console.log(error);
    return res
      .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
      .json(errorResponse("Session renewal is temporarily unavailable"));
  }
}

export async function getCurrentUser(req, res) {
  try {
    const result = await authService.getCurrentUser(req.auth.userId);

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in auth controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function logout(req, res) {
  try {
    await authService.logoutUser(req.auth.userId);
    clearAuthCookies(res);

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", {}));
  } catch (error) {
    console.log(error);
    console.log("error in auth controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function verifyEmail(req, res) {
  try {
    const result = await authService.verifyEmail(req.body.token);

    if (result.error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse(result.error));
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", { user: result.user }));
  } catch (error) {
    console.log(error);
    console.log("error in auth controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function forgotPassword(req, res) {
  try {
    await authService.forgotPassword(req.body.email);

    return res.status(HTTP_STATUS.OK).json(
      successResponse("If the email exists, a password reset token has been prepared", {})
    );
  } catch (error) {
    console.log(error);
    console.log("error in auth controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function resetPassword(req, res) {
  try {
    const result = await authService.resetPassword(req.body);

    if (result.error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse(result.error));
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", { user: result.user }));
  } catch (error) {
    console.log(error);
    console.log("error in auth controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function changePassword(req, res) {
  try {
    const result = await authService.changePassword(req.auth.userId, req.body);

    if (result.error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse(result.error));
    }

    clearAuthCookies(res);

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", { user: result.user }));
  } catch (error) {
    console.log(error);
    console.log("error in auth controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}
