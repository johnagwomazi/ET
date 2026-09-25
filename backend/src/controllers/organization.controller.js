import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as organizationMemberService from "../services/organizationMember.service.js";
import * as organizationService from "../services/organization.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";
import { getOrganizationRolePermissions } from "../utils/organizationPermission.util.js";

function sendServiceError(res, errorResult) {
  return res.status(errorResult.statusCode || HTTP_STATUS.BAD_REQUEST).json(
    errorResponse(errorResult.error || "Something went wrong")
  );
}

export async function getOrganizations(req, res) {
  try {
    const result = await organizationService.getOrganizations(req.query);

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getOrganizationById(req, res) {
  try {
    const result = await organizationService.getOrganizationById(req.params.organizationId);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getOrganizationDetails(req, res) {
  try {
    const result = await organizationService.getOrganizationDetails(
      req.params.organizationId,
      req.query
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function suspendOrganization(req, res) {
  try {
    const result = await organizationService.suspendOrganization(
      req.params.organizationId,
      req.auth.userId,
      req.body.suspensionReason
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Organization suspended successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function reactivateOrganization(req, res) {
  try {
    const result = await organizationService.reactivateOrganization(req.params.organizationId, req.auth.userId);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Organization reactivated successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function deleteOrganization(req, res) {
  try {
    const result = await organizationService.deleteOrganization(req.params.organizationId, req.auth.userId);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Organization deleted successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getOrganizationContext(req, res) {
  try {
    if (!req.organization) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
    }

    return res.status(HTTP_STATUS.OK).json(
      successResponse("Operation successful", {
        organization: req.organization,
        organizationId: req.organizationId,
        organizationPermissions: getOrganizationRolePermissions(req.user, req.organization),
      })
    );
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getMyOrganizationProfile(req, res) {
  try {
    if (!req.organizationId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
    }

    const result = await organizationService.getMyOrganizationProfile(req.organizationId);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function updateMyOrganizationProfile(req, res) {
  try {
    if (!req.organizationId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
    }

    const result = await organizationService.updateMyOrganizationProfile(req.organizationId, req.body);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Organization profile updated successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getMyOrganizationSettings(req, res) {
  try {
    if (!req.organizationId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
    }

    const result = await organizationService.getMyOrganizationSettings(req.organizationId);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function updateMyOrganizationSettings(req, res) {
  try {
    if (!req.organizationId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
    }

    const result = await organizationService.updateMyOrganizationSettings(req.organizationId, req.body);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Organization settings updated successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getMyOrganizationDashboard(req, res) {
  try {
    if (!req.organizationId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
    }

    const result = await organizationService.getOrganizationDashboard(req.organizationId);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getMyOrganizationMembers(req, res) {
  try {
    if (!req.organizationId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
    }

    const result = await organizationMemberService.getOrganizationMembers(req.organizationId, req.auth.userId, req.query);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function inviteOrganizationMember(req, res) {
  try {
    if (!req.organizationId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
    }

    const result = await organizationMemberService.inviteOrganizationMember(
      req.organizationId,
      req.auth.userId,
      req.body
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.CREATED).json(successResponse("Member invited successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function updateOrganizationMemberRole(req, res) {
  try {
    if (!req.organizationId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
    }

    const result = await organizationMemberService.updateOrganizationMemberRole(
      req.organizationId,
      req.auth.userId,
      req.params.memberId,
      req.body
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Member role updated successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function removeOrganizationMember(req, res) {
  try {
    if (!req.organizationId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
    }

    const result = await organizationMemberService.removeOrganizationMember(
      req.organizationId,
      req.auth.userId,
      req.params.memberId
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Member removed successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in organization controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}
