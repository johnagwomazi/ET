import crypto from "node:crypto";
import { ACCOUNT_STATUS } from "../constants/accountStatus.constants.js";
import {
  FINANCE_LOCK_DURATION_MS,
  FINANCE_LOCK_RETRY_COUNT,
  FINANCE_LOCK_RETRY_DELAY_MS,
  PAYSTACK_TRANSFER_EVENTS,
  WITHDRAWAL_COMPLETED_STATUSES,
  WITHDRAWAL_PROVIDER_STATUS,
  WITHDRAWAL_RESERVED_STATUSES,
} from "../constants/finance.constants.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { ORGANIZATION_STATUS } from "../constants/organizationStatus.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import { DEFAULT_CURRENCY, WITHDRAWAL_STATUS } from "../constants/ticketing.constants.js";
import * as analyticsRepository from "../repositories/analytics.repository.js";
import * as authRepository from "../repositories/auth.repository.js";
import * as organizationRepository from "../repositories/organization.repository.js";
import * as withdrawalRepository from "../repositories/withdrawal.repository.js";
import { fromMinorUnits, toMinorUnits } from "../utils/analytics.util.js";
import { mapFinanceWithdrawal, mapFinancialPosition, mapPayoutDestination } from "../utils/financeResponse.util.js";
import { buildPaginationMeta, buildPaginationOptions } from "../utils/query.util.js";
import { getDocumentId } from "../utils/ticketingResponse.util.js";
import * as paystackService from "./paystack.service.js";

const defaultDependencies = {
  analyticsRepository,
  authRepository,
  organizationRepository,
  withdrawalRepository,
  paystackService,
};

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function serviceError(error, statusCode) {
  return { error, statusCode };
}

function isActiveUser(user) {
  return !user?.isDeleted && (!user?.accountStatus || user.accountStatus === ACCOUNT_STATUS.ACTIVE);
}

function isActiveOrganization(organization) {
  return Boolean(
    organization &&
    !organization.isDeleted &&
    organization.status === ORGANIZATION_STATUS.APPROVED
  );
}

async function requireOrganizationAdmin(organizationId, actorUserId, dependencies) {
  const [actor, organization] = await Promise.all([
    dependencies.authRepository.findAuthUserById(actorUserId),
    dependencies.organizationRepository.findOrganizationWithPayoutDetailsById(organizationId),
  ]);

  if (!actor || !isActiveUser(actor)) return serviceError("Not authorized", HTTP_STATUS.UNAUTHORIZED);
  if (actor.role !== USER_ROLES.ADMIN) return serviceError("You do not have access to this resource", HTTP_STATUS.FORBIDDEN);
  if (getDocumentId(actor.organization) !== getDocumentId(organizationId)) {
    return serviceError("You cannot access another organization", HTTP_STATUS.FORBIDDEN);
  }
  if (!isActiveOrganization(organization)) {
    return serviceError("Your organization is not active", HTTP_STATUS.FORBIDDEN);
  }

  return { actor, organization };
}

async function requireSuperAdmin(actorUserId, dependencies) {
  const actor = await dependencies.authRepository.findAuthUserById(actorUserId);
  if (!actor || !isActiveUser(actor)) return serviceError("Not authorized", HTTP_STATUS.UNAUTHORIZED);
  if (actor.role !== USER_ROLES.SUPER_ADMIN) {
    return serviceError("You do not have access to this resource", HTTP_STATUS.FORBIDDEN);
  }
  return { actor };
}

function sumStatusAmounts(totals, statuses) {
  return statuses.reduce((sum, status) => sum + Number(totals[status]?.amountMinor || 0), 0);
}

export async function calculateOrganizationFinancialPosition(organizationId, dependencies = defaultDependencies) {
  const [revenue, withdrawalTotals] = await Promise.all([
    dependencies.analyticsRepository.getOrganizationFinancialTotals(organizationId),
    dependencies.withdrawalRepository.getOrganizationWithdrawalTotals(organizationId),
  ]);
  const completedWithdrawalsMinor = sumStatusAmounts(withdrawalTotals, WITHDRAWAL_COMPLETED_STATUSES);
  const reservedWithdrawalsMinor = sumStatusAmounts(withdrawalTotals, WITHDRAWAL_RESERVED_STATUSES);
  const rawAvailableMinor = Number(revenue.netRevenueMinor || 0) - completedWithdrawalsMinor - reservedWithdrawalsMinor;

  return {
    currency: revenue.currency || DEFAULT_CURRENCY,
    grossSalesMinor: Math.round(Number(revenue.grossSalesMinor || 0)),
    refundsMinor: Math.round(Number(revenue.refundsMinor || 0)),
    netRevenueMinor: Math.round(Number(revenue.netRevenueMinor || 0)),
    completedWithdrawalsMinor,
    reservedWithdrawalsMinor,
    availableBalanceMinor: Math.max(0, rawAvailableMinor),
    balanceDeficitMinor: Math.max(0, -rawAvailableMinor),
  };
}

async function acquireFinanceLock(organizationId, dependencies) {
  if (!dependencies.organizationRepository.acquireOrganizationFinanceLock) return { token: null };
  const token = crypto.randomUUID();

  for (let attempt = 0; attempt < FINANCE_LOCK_RETRY_COUNT; attempt += 1) {
    const now = new Date();
    const organization = await dependencies.organizationRepository.acquireOrganizationFinanceLock(
      organizationId,
      token,
      new Date(now.getTime() + FINANCE_LOCK_DURATION_MS),
      now
    );
    if (organization) return { token, organization };
    await delay(FINANCE_LOCK_RETRY_DELAY_MS);
  }

  return serviceError("Organization finance operation is already in progress", HTTP_STATUS.CONFLICT);
}

async function releaseFinanceLock(organizationId, token, dependencies) {
  if (token && dependencies.organizationRepository.releaseOrganizationFinanceLock) {
    await dependencies.organizationRepository.releaseOrganizationFinanceLock(organizationId, token);
  }
}

function hasPayoutDestination(organization) {
  return Boolean(organization?.payoutDetails?.recipientCode);
}

function withdrawalReference() {
  return `wd_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function transferReference(withdrawal) {
  return `trf_${withdrawal.reference}`.slice(0, 50);
}

function buildWithdrawalFilter(query = {}, organizationId = null) {
  const filter = {};
  if (organizationId) filter.organization = organizationId;
  if (query.organizationId) filter.organization = query.organizationId;
  if (query.status) filter.status = query.status;
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = query.startDate;
    if (query.endDate) filter.createdAt.$lte = query.endDate;
  }
  return filter;
}

export async function getOrganizationFinanceSummary(organizationId, actorUserId, dependencies = defaultDependencies) {
  const context = await requireOrganizationAdmin(organizationId, actorUserId, dependencies);
  if (context.error) return context;
  const position = await calculateOrganizationFinancialPosition(organizationId, dependencies);
  return {
    ...mapFinancialPosition(position),
    payoutDestination: mapPayoutDestination(context.organization.payoutDetails),
  };
}

export async function updateOrganizationPayoutDetails(organizationId, actorUserId, payload, dependencies = defaultDependencies) {
  const context = await requireOrganizationAdmin(organizationId, actorUserId, dependencies);
  if (context.error) return context;
  if (dependencies.paystackService.isConfigured && !dependencies.paystackService.isConfigured()) {
    return serviceError("Paystack is not configured", HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  let resolved;
  try {
    resolved = await dependencies.paystackService.resolveAccountNumber({
      accountNumber: payload.accountNumber,
      bankCode: payload.bankCode,
    });
  } catch (error) {
    return serviceError("Payout account verification is temporarily unavailable", HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
  if (!resolved?.status || !resolved.data?.account_name) {
    return serviceError(resolved?.message || "Unable to verify payout account", HTTP_STATUS.BAD_REQUEST);
  }

  let recipient;
  try {
    recipient = await dependencies.paystackService.createTransferRecipient({
      name: resolved.data.account_name,
      accountNumber: payload.accountNumber,
      bankCode: payload.bankCode,
      currency: DEFAULT_CURRENCY,
      description: `Payout recipient for ${context.organization.organizationName}`,
    });
  } catch (error) {
    return serviceError("Payout recipient setup is temporarily unavailable", HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
  if (!recipient?.status || !recipient.data?.recipient_code) {
    return serviceError(recipient?.message || "Unable to create payout recipient", HTTP_STATUS.BAD_REQUEST);
  }

  const details = recipient.data.details || {};
  const updated = await dependencies.organizationRepository.updateOrganizationPayoutDetails(organizationId, {
    accountName: details.account_name || resolved.data.account_name,
    accountNumberLast4: payload.accountNumber.slice(-4),
    bankCode: details.bank_code || payload.bankCode,
    bankName: details.bank_name || "",
    currency: recipient.data.currency || DEFAULT_CURRENCY,
    recipientCode: recipient.data.recipient_code,
    updatedBy: actorUserId,
    updatedAt: new Date(),
  });

  return { payoutDestination: mapPayoutDestination(updated.payoutDetails) };
}

export async function requestWithdrawal(organizationId, actorUserId, payload, dependencies = defaultDependencies) {
  const context = await requireOrganizationAdmin(organizationId, actorUserId, dependencies);
  if (context.error) return context;
  if (!hasPayoutDestination(context.organization)) {
    return serviceError("Configure a verified payout account before requesting a withdrawal", HTTP_STATUS.BAD_REQUEST);
  }

  const amountMinor = toMinorUnits(payload.amount);
  if (amountMinor <= 0) return serviceError("Withdrawal amount must be greater than zero", HTTP_STATUS.BAD_REQUEST);
  const lock = await acquireFinanceLock(organizationId, dependencies);
  if (lock.error) return lock;

  try {
    const organization = lock.organization || context.organization;
    if (!isActiveOrganization(organization) || !hasPayoutDestination(organization)) {
      return serviceError("Organization payout eligibility changed", HTTP_STATUS.CONFLICT);
    }
    const position = await calculateOrganizationFinancialPosition(organizationId, dependencies);
    if (position.currency !== (payload.currency || DEFAULT_CURRENCY)) {
      return serviceError("Withdrawal currency does not match organization revenue", HTTP_STATUS.BAD_REQUEST);
    }
    if (amountMinor > position.availableBalanceMinor) {
      return serviceError("Withdrawal amount exceeds available balance", HTTP_STATUS.BAD_REQUEST);
    }

    const withdrawal = await dependencies.withdrawalRepository.createWithdrawal({
      reference: withdrawalReference(),
      organization: organizationId,
      requestedBy: actorUserId,
      amount: fromMinorUnits(amountMinor),
      amountMinor,
      currency: payload.currency || DEFAULT_CURRENCY,
      status: WITHDRAWAL_STATUS.PENDING,
      providerRecipientCode: organization.payoutDetails.recipientCode,
      payoutDestination: {
        accountName: organization.payoutDetails.accountName,
        accountNumberLast4: organization.payoutDetails.accountNumberLast4,
        bankName: organization.payoutDetails.bankName,
      },
    });

    return {
      withdrawal: mapFinanceWithdrawal(withdrawal),
      availableBalance: fromMinorUnits(position.availableBalanceMinor - amountMinor),
    };
  } finally {
    await releaseFinanceLock(organizationId, lock.token, dependencies);
  }
}

export async function getOrganizationWithdrawals(organizationId, actorUserId, query = {}, dependencies = defaultDependencies) {
  const context = await requireOrganizationAdmin(organizationId, actorUserId, dependencies);
  if (context.error) return context;
  const pagination = buildPaginationOptions(query, { page: 1, limit: 20, sortBy: "createdAt" });
  const filter = buildWithdrawalFilter(query, organizationId);
  const [withdrawals, totalItems, position] = await Promise.all([
    dependencies.withdrawalRepository.findWithdrawals(filter, pagination),
    dependencies.withdrawalRepository.countWithdrawals(filter),
    calculateOrganizationFinancialPosition(organizationId, dependencies),
  ]);
  return {
    withdrawals: withdrawals.map(mapFinanceWithdrawal),
    balance: mapFinancialPosition(position),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

export async function getPlatformWithdrawals(actorUserId, query = {}, dependencies = defaultDependencies) {
  const access = await requireSuperAdmin(actorUserId, dependencies);
  if (access.error) return access;
  const pagination = buildPaginationOptions(query, { page: 1, limit: 20, sortBy: "createdAt" });
  const filter = buildWithdrawalFilter(query);
  const [withdrawals, totalItems] = await Promise.all([
    dependencies.withdrawalRepository.findWithdrawals(filter, pagination),
    dependencies.withdrawalRepository.countWithdrawals(filter),
  ]);
  return {
    withdrawals: withdrawals.map(mapFinanceWithdrawal),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

export async function getPlatformWithdrawalDetails(withdrawalId, actorUserId, dependencies = defaultDependencies) {
  const access = await requireSuperAdmin(actorUserId, dependencies);
  if (access.error) return access;
  const withdrawal = await dependencies.withdrawalRepository.findWithdrawalById(withdrawalId);
  if (!withdrawal) return serviceError("Withdrawal not found", HTTP_STATUS.NOT_FOUND);
  const organizationId = getDocumentId(withdrawal.organization);
  const [organization, position, recent] = await Promise.all([
    dependencies.organizationRepository.findOrganizationWithPayoutDetailsById(organizationId),
    calculateOrganizationFinancialPosition(organizationId, dependencies),
    dependencies.withdrawalRepository.findWithdrawals({ organization: organizationId }, { limit: 5 }),
  ]);
  return {
    withdrawal: mapFinanceWithdrawal(withdrawal),
    financialSummary: mapFinancialPosition(position),
    payoutDestination: mapPayoutDestination(organization?.payoutDetails),
    recentWithdrawals: recent.map(mapFinanceWithdrawal),
  };
}

function normalizeProviderStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "success") return WITHDRAWAL_PROVIDER_STATUS.SUCCESS;
  if (value === "failed") return WITHDRAWAL_PROVIDER_STATUS.FAILED;
  if (value === "reversed") return WITHDRAWAL_PROVIDER_STATUS.REVERSED;
  if (value === "otp") return WITHDRAWAL_PROVIDER_STATUS.OTP;
  if (["pending", "processing", "received"].includes(value)) return WITHDRAWAL_PROVIDER_STATUS.PROCESSING;
  return WITHDRAWAL_PROVIDER_STATUS.UNKNOWN;
}

function providerFailureReason(providerData, fallback) {
  const value = providerData?.failureReason || providerData?.reason || providerData?.failures;
  if (!value) return fallback;
  return typeof value === "string" ? value : JSON.stringify(value);
}

async function applyProviderTransferState(withdrawal, providerData, dependencies) {
  const providerStatus = normalizeProviderStatus(providerData?.status);
  const now = new Date();
  const update = {
    transferStatus: providerStatus,
    providerTransferCode: providerData?.transfer_code || withdrawal.providerTransferCode || "",
    failureReason: "",
  };
  if (providerStatus === WITHDRAWAL_PROVIDER_STATUS.SUCCESS) {
    update.status = WITHDRAWAL_STATUS.PAID;
    update.paidAt = providerData?.transferred_at ? new Date(providerData.transferred_at) : now;
    update.completedAt = update.paidAt;
  } else if ([WITHDRAWAL_PROVIDER_STATUS.FAILED, WITHDRAWAL_PROVIDER_STATUS.REVERSED].includes(providerStatus)) {
    update.status = WITHDRAWAL_STATUS.FAILED;
    update.failureReason = providerFailureReason(providerData, `Transfer ${providerStatus.toLowerCase()}`);
  } else {
    update.status = WITHDRAWAL_STATUS.PROCESSING;
  }
  const expectedStatuses = [WITHDRAWAL_STATUS.PROCESSING, WITHDRAWAL_STATUS.APPROVED];
  if (providerStatus === WITHDRAWAL_PROVIDER_STATUS.REVERSED) {
    expectedStatuses.push(WITHDRAWAL_STATUS.PAID);
  }
  const updated = await dependencies.withdrawalRepository.updateWithdrawalByStatus(
    getDocumentId(withdrawal),
    expectedStatuses,
    update
  );
  return updated || dependencies.withdrawalRepository.findWithdrawalById(getDocumentId(withdrawal));
}

export async function approveWithdrawal(withdrawalId, reviewerId, payload = {}, dependencies = defaultDependencies) {
  const access = await requireSuperAdmin(reviewerId, dependencies);
  if (access.error) return access;
  let withdrawal = await dependencies.withdrawalRepository.findWithdrawalById(withdrawalId);
  if (!withdrawal) return serviceError("Withdrawal not found", HTTP_STATUS.NOT_FOUND);
  if ([WITHDRAWAL_STATUS.PROCESSING, WITHDRAWAL_STATUS.PAID].includes(withdrawal.status)) {
    return { withdrawal: mapFinanceWithdrawal(withdrawal), idempotent: true };
  }
  if (withdrawal.status !== WITHDRAWAL_STATUS.PENDING) {
    return serviceError("Withdrawal cannot be approved from its current state", HTTP_STATUS.CONFLICT);
  }
  if (dependencies.paystackService.isConfigured && !dependencies.paystackService.isConfigured()) {
    return serviceError("Paystack is not configured", HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  const organizationId = getDocumentId(withdrawal.organization);
  const lock = await acquireFinanceLock(organizationId, dependencies);
  if (lock.error) return lock;

  try {
    withdrawal = await dependencies.withdrawalRepository.findWithdrawalById(withdrawalId);
    if ([WITHDRAWAL_STATUS.PROCESSING, WITHDRAWAL_STATUS.PAID].includes(withdrawal?.status)) {
      return { withdrawal: mapFinanceWithdrawal(withdrawal), idempotent: true };
    }
    if (!withdrawal || withdrawal.status !== WITHDRAWAL_STATUS.PENDING) {
      return serviceError("Withdrawal has already been reviewed", HTTP_STATUS.CONFLICT);
    }
    const organization = lock.organization || await dependencies.organizationRepository.findOrganizationWithPayoutDetailsById(organizationId);
    if (!isActiveOrganization(organization)) return serviceError("Organization is not eligible for withdrawal", HTTP_STATUS.CONFLICT);
    if (!hasPayoutDestination(organization)) return serviceError("Organization payout details are missing", HTTP_STATUS.BAD_REQUEST);
    const position = await calculateOrganizationFinancialPosition(organizationId, dependencies);
    const obligationsMinor = position.completedWithdrawalsMinor + position.reservedWithdrawalsMinor;
    if (obligationsMinor > position.netRevenueMinor) {
      return serviceError("Current net revenue no longer covers reserved withdrawals", HTTP_STATUS.CONFLICT);
    }

    const now = new Date();
    const reference = withdrawal.transferReference || transferReference(withdrawal);
    const claimed = await dependencies.withdrawalRepository.updateWithdrawalByStatus(
      withdrawalId,
      [WITHDRAWAL_STATUS.PENDING],
      {
        status: WITHDRAWAL_STATUS.PROCESSING,
        transferStatus: WITHDRAWAL_PROVIDER_STATUS.PROCESSING,
        transferReference: reference,
        providerRecipientCode: withdrawal.providerRecipientCode || organization.payoutDetails.recipientCode,
        reviewedBy: reviewerId,
        reviewedAt: now,
        approvedAt: now,
        failureReason: "",
      }
    );
    if (!claimed) {
      const current = await dependencies.withdrawalRepository.findWithdrawalById(withdrawalId);
      if ([WITHDRAWAL_STATUS.PROCESSING, WITHDRAWAL_STATUS.PAID].includes(current?.status)) {
        return { withdrawal: mapFinanceWithdrawal(current), idempotent: true };
      }
      return serviceError("Withdrawal has already been reviewed", HTTP_STATUS.CONFLICT);
    }
    withdrawal = claimed;
  } finally {
    await releaseFinanceLock(organizationId, lock.token, dependencies);
  }

  try {
    const transfer = await dependencies.paystackService.initiateTransfer({
      amount: fromMinorUnits(
        Number.isInteger(withdrawal.amountMinor) ? withdrawal.amountMinor : toMinorUnits(withdrawal.amount)
      ),
      recipient: withdrawal.providerRecipientCode,
      reason: payload.reason || `Withdrawal ${withdrawal.reference}`,
      reference: withdrawal.transferReference,
    });
    if (!transfer?.status) {
      const failed = await dependencies.withdrawalRepository.updateWithdrawalByStatus(
        withdrawalId,
        [WITHDRAWAL_STATUS.PROCESSING],
        {
          status: WITHDRAWAL_STATUS.FAILED,
          transferStatus: WITHDRAWAL_PROVIDER_STATUS.FAILED,
          failureReason: transfer?.message || "Transfer provider request failed",
        }
      );
      return { withdrawal: mapFinanceWithdrawal(failed) };
    }
    const updated = await applyProviderTransferState(withdrawal, transfer.data, dependencies);
    return { withdrawal: mapFinanceWithdrawal(updated) };
  } catch (error) {
    const unknown = await dependencies.withdrawalRepository.updateWithdrawalByStatus(
      withdrawalId,
      [WITHDRAWAL_STATUS.PROCESSING],
      {
        transferStatus: WITHDRAWAL_PROVIDER_STATUS.UNKNOWN,
        failureReason: "Transfer status is unknown; reconciliation is required",
      }
    );
    return { withdrawal: mapFinanceWithdrawal(unknown), reconciliationRequired: true };
  }
}

export async function rejectWithdrawal(withdrawalId, reviewerId, reason, dependencies = defaultDependencies) {
  const access = await requireSuperAdmin(reviewerId, dependencies);
  if (access.error) return access;
  const now = new Date();
  const rejected = await dependencies.withdrawalRepository.updateWithdrawalByStatus(
    withdrawalId,
    [WITHDRAWAL_STATUS.PENDING],
    {
      status: WITHDRAWAL_STATUS.REJECTED,
      rejectionReason: reason,
      reviewedBy: reviewerId,
      reviewedAt: now,
      rejectedAt: now,
    }
  );
  if (rejected) return { withdrawal: mapFinanceWithdrawal(rejected) };
  const current = await dependencies.withdrawalRepository.findWithdrawalById(withdrawalId);
  if (!current) return serviceError("Withdrawal not found", HTTP_STATUS.NOT_FOUND);
  return serviceError("Withdrawal has already been reviewed", HTTP_STATUS.CONFLICT);
}

export async function reconcileWithdrawal(withdrawalId, reviewerId, dependencies = defaultDependencies) {
  const access = await requireSuperAdmin(reviewerId, dependencies);
  if (access.error) return access;
  const withdrawal = await dependencies.withdrawalRepository.findWithdrawalById(withdrawalId);
  if (!withdrawal) return serviceError("Withdrawal not found", HTTP_STATUS.NOT_FOUND);
  if (withdrawal.status !== WITHDRAWAL_STATUS.PROCESSING || !withdrawal.transferReference) {
    return serviceError("Only processing withdrawals can be reconciled", HTTP_STATUS.CONFLICT);
  }
  let verification;
  try {
    verification = await dependencies.paystackService.verifyTransfer(withdrawal.transferReference);
  } catch (error) {
    return serviceError("Transfer verification is temporarily unavailable", HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
  if (!verification?.status) {
    return serviceError(verification?.message || "Unable to verify transfer", HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
  if (
    Number(verification.data?.amount) !== Number(withdrawal.amountMinor) ||
    verification.data?.currency !== withdrawal.currency ||
    verification.data?.reference !== withdrawal.transferReference
  ) {
    return serviceError("Provider transfer details do not match this withdrawal", HTTP_STATUS.CONFLICT);
  }
  const updated = await applyProviderTransferState(withdrawal, verification.data, dependencies);
  return { withdrawal: mapFinanceWithdrawal(updated) };
}

export async function handleTransferWebhook(event, providerData, dependencies = defaultDependencies) {
  if (!Object.values(PAYSTACK_TRANSFER_EVENTS).includes(event)) return { processed: false };
  const withdrawal = await dependencies.withdrawalRepository.findWithdrawalByTransferReference(providerData?.reference);
  if (!withdrawal) return { processed: true, matched: false };
  const isReversal = event === PAYSTACK_TRANSFER_EVENTS.REVERSED;
  if (withdrawal.status === WITHDRAWAL_STATUS.FAILED || (withdrawal.status === WITHDRAWAL_STATUS.PAID && !isReversal)) {
    return { processed: true, duplicate: true, withdrawal: mapFinanceWithdrawal(withdrawal) };
  }
  const expectedAmountMinor = Number.isInteger(withdrawal.amountMinor)
    ? withdrawal.amountMinor
    : toMinorUnits(withdrawal.amount);
  if (
    (providerData?.amount !== undefined && Number(providerData.amount) !== expectedAmountMinor) ||
    (providerData?.currency && providerData.currency !== withdrawal.currency)
  ) {
    return { processed: true, matched: false, mismatch: true };
  }
  const eventStatus = {
    [PAYSTACK_TRANSFER_EVENTS.SUCCESS]: "success",
    [PAYSTACK_TRANSFER_EVENTS.FAILED]: "failed",
    [PAYSTACK_TRANSFER_EVENTS.REVERSED]: "reversed",
  }[event];
  const updated = await applyProviderTransferState(withdrawal, { ...providerData, status: eventStatus }, dependencies);
  return { processed: true, matched: true, withdrawal: mapFinanceWithdrawal(updated) };
}
