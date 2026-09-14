import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as financeService from "../services/finance.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

function sendResult(res, result, successMessage, statusCode = HTTP_STATUS.OK) {
  if (result.error) {
    return res.status(result.statusCode || HTTP_STATUS.BAD_REQUEST).json(errorResponse(result.error));
  }
  return res.status(statusCode).json(successResponse(successMessage, result));
}

export async function getOrganizationFinanceSummary(req, res, next) {
  try {
    return sendResult(res, await financeService.getOrganizationFinanceSummary(req.organizationId, req.auth.userId), "Operation successful");
  } catch (error) {
    error.operation = "finance.controller.getOrganizationFinanceSummary";
    return next(error);
  }
}

export async function getOrganizationPayoutBanks(req, res, next) {
  try {
    return sendResult(res, await financeService.getOrganizationPayoutBanks(req.organizationId, req.auth.userId), "Banks retrieved successfully");
  } catch (error) {
    error.operation = "finance.controller.getOrganizationPayoutBanks";
    return next(error);
  }
}

export async function resolveOrganizationPayoutAccount(req, res, next) {
  try {
    return sendResult(
      res,
      await financeService.resolveOrganizationPayoutAccount(req.organizationId, req.auth.userId, req.body),
      "Account verified. Confirm the account name before saving."
    );
  } catch (error) {
    error.operation = "finance.controller.resolveOrganizationPayoutAccount";
    return next(error);
  }
}

export async function updateOrganizationPayoutDetails(req, res, next) {
  try {
    return sendResult(
      res,
      await financeService.updateOrganizationPayoutDetails(req.organizationId, req.auth.userId, req.body),
      "Payout details updated successfully"
    );
  } catch (error) {
    error.operation = "finance.controller.updateOrganizationPayoutDetails";
    return next(error);
  }
}

export async function requestWithdrawal(req, res, next) {
  try {
    return sendResult(
      res,
      await financeService.requestWithdrawal(req.organizationId, req.auth.userId, req.body),
      "Withdrawal requested successfully",
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    error.operation = "finance.controller.requestWithdrawal";
    return next(error);
  }
}

export async function getOrganizationWithdrawals(req, res, next) {
  try {
    return sendResult(
      res,
      await financeService.getOrganizationWithdrawals(req.organizationId, req.auth.userId, req.query),
      "Operation successful"
    );
  } catch (error) {
    error.operation = "finance.controller.getOrganizationWithdrawals";
    return next(error);
  }
}

export async function getPlatformWithdrawals(req, res, next) {
  try {
    return sendResult(res, await financeService.getPlatformWithdrawals(req.auth.userId, req.query), "Operation successful");
  } catch (error) {
    error.operation = "finance.controller.getPlatformWithdrawals";
    return next(error);
  }
}

export async function getPlatformWithdrawalDetails(req, res, next) {
  try {
    return sendResult(
      res,
      await financeService.getPlatformWithdrawalDetails(req.params.withdrawalId, req.auth.userId),
      "Operation successful"
    );
  } catch (error) {
    error.operation = "finance.controller.getPlatformWithdrawalDetails";
    return next(error);
  }
}

export async function approveWithdrawal(req, res, next) {
  try {
    return sendResult(
      res,
      await financeService.approveWithdrawal(req.params.withdrawalId, req.auth.userId, req.body),
      "Withdrawal approval processed successfully"
    );
  } catch (error) {
    error.operation = "finance.controller.approveWithdrawal";
    return next(error);
  }
}

export async function rejectWithdrawal(req, res, next) {
  try {
    return sendResult(
      res,
      await financeService.rejectWithdrawal(req.params.withdrawalId, req.auth.userId, req.body.reason),
      "Withdrawal rejected successfully"
    );
  } catch (error) {
    error.operation = "finance.controller.rejectWithdrawal";
    return next(error);
  }
}

export async function reconcileWithdrawal(req, res, next) {
  try {
    return sendResult(
      res,
      await financeService.reconcileWithdrawal(req.params.withdrawalId, req.auth.userId),
      "Withdrawal reconciliation completed"
    );
  } catch (error) {
    error.operation = "finance.controller.reconcileWithdrawal";
    return next(error);
  }
}

