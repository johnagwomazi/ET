import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as authService from "../services/auth.service.js";
import * as adminDashboardService from "../services/adminDashboard.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";
import { setAuthCookies } from "../utils/authCookie.util.js";

export async function login(req, res) {
  try {
    const result = await authService.loginSuperAdmin(req.body);

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
