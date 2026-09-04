import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as financeService from "../services/finance.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

function sendResult(res, result, successMessage, statusCode = HTTP_STATUS.OK) {
  if (result.error) {
    return res.status(result.statusCode || HTTP_STATUS.BAD_REQUEST).json(errorResponse(result.error));
  }
  return res.status(statusCode).json(successResponse(successMessage, result));
}

export async function getOrganizationFinanceSummary(req, res) {
  return sendResult(res, await financeService.getOrganizationFinanceSummary(req.organizationId, req.auth.userId), "Operation successful");
}

export async function updateOrganizationPayoutDetails(req, res) {
  return sendResult(
    res,
    await financeService.updateOrganizationPayoutDetails(req.organizationId, req.auth.userId, req.body),
    "Payout details updated successfully"
  );
}

export async function requestWithdrawal(req, res) {
  return sendResult(
    res,
    await financeService.requestWithdrawal(req.organizationId, req.auth.userId, req.body),
    "Withdrawal requested successfully",
    HTTP_STATUS.CREATED
  );
}

export async function getOrganizationWithdrawals(req, res) {
  return sendResult(
    res,
    await financeService.getOrganizationWithdrawals(req.organizationId, req.auth.userId, req.query),
    "Operation successful"
  );
}

export async function getPlatformWithdrawals(req, res) {
  return sendResult(res, await financeService.getPlatformWithdrawals(req.auth.userId, req.query), "Operation successful");
}

export async function getPlatformWithdrawalDetails(req, res) {
  return sendResult(
    res,
    await financeService.getPlatformWithdrawalDetails(req.params.withdrawalId, req.auth.userId),
    "Operation successful"
  );
}

export async function approveWithdrawal(req, res) {
  return sendResult(
    res,
    await financeService.approveWithdrawal(req.params.withdrawalId, req.auth.userId, req.body),
    "Withdrawal approval processed successfully"
  );
}

export async function rejectWithdrawal(req, res) {
  return sendResult(
    res,
    await financeService.rejectWithdrawal(req.params.withdrawalId, req.auth.userId, req.body.reason),
    "Withdrawal rejected successfully"
  );
}

export async function reconcileWithdrawal(req, res) {
  return sendResult(
    res,
    await financeService.reconcileWithdrawal(req.params.withdrawalId, req.auth.userId),
    "Withdrawal reconciliation completed"
  );
}

