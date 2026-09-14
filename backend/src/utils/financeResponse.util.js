import { fromMinorUnits } from "./analytics.util.js";
import { getDocumentId } from "./ticketingResponse.util.js";

function mapNamedEntity(value, nameField) {
  if (!value || typeof value !== "object") return null;
  return {
    id: getDocumentId(value),
    name: value[nameField] || "",
    status: value.status || value.accountStatus || null,
  };
}

function mapRequester(value) {
  if (!value || typeof value !== "object") return null;
  return {
    id: getDocumentId(value),
    firstName: value.firstName || "",
    lastName: value.lastName || "",
    email: value.email || "",
  };
}

export function mapPayoutDestination(payoutDetails = {}) {
  return {
    configured: Boolean(payoutDetails.recipientCode),
    verified: Boolean(payoutDetails.recipientCode),
    accountName: payoutDetails.accountName || "",
    accountNumberMasked: payoutDetails.accountNumberLast4 ? `******${payoutDetails.accountNumberLast4}` : "",
    bankName: payoutDetails.bankName || "",
    currency: payoutDetails.currency || "NGN",
    updatedAt: payoutDetails.updatedAt || null,
    verifiedAt: payoutDetails.verifiedAt || null,
  };
}

export function mapFinancialPosition(position = {}) {
  return {
    currency: position.currency || "NGN",
    grossSales: fromMinorUnits(position.grossSalesMinor),
    refunds: fromMinorUnits(position.refundsMinor),
    refundedAmount: fromMinorUnits(position.refundsMinor),
    netRevenue: fromMinorUnits(position.netRevenueMinor),
    completedWithdrawals: fromMinorUnits(position.completedWithdrawalsMinor),
    pendingWithdrawals: fromMinorUnits(position.reservedWithdrawalsMinor),
    committedWithdrawals: fromMinorUnits(
      Number(position.completedWithdrawalsMinor || 0) + Number(position.reservedWithdrawalsMinor || 0)
    ),
    availableBalance: fromMinorUnits(position.availableBalanceMinor),
    balanceDeficit: fromMinorUnits(position.balanceDeficitMinor),
  };
}

export function mapFinanceWithdrawal(withdrawalDocument) {
  if (!withdrawalDocument) return null;
  const withdrawal = typeof withdrawalDocument.toObject === "function"
    ? withdrawalDocument.toObject()
    : withdrawalDocument;
  const organizationId = getDocumentId(withdrawal.organization);
  const requesterId = getDocumentId(withdrawal.requestedBy);
  const reviewerId = getDocumentId(withdrawal.reviewedBy);
  const amountMinor = Number.isInteger(withdrawal.amountMinor)
    ? withdrawal.amountMinor
    : Math.round(Number(withdrawal.amount || 0) * 100);

  return {
    id: getDocumentId(withdrawal),
    reference: withdrawal.reference,
    organization: organizationId,
    organizationDetails: mapNamedEntity(withdrawal.organization, "organizationName"),
    requestedBy: requesterId,
    requester: mapRequester(withdrawal.requestedBy),
    reviewedBy: reviewerId,
    reviewer: mapRequester(withdrawal.reviewedBy),
    amount: fromMinorUnits(amountMinor),
    currency: withdrawal.currency || "NGN",
    status: withdrawal.status,
    transferStatus: withdrawal.transferStatus || "NOT_STARTED",
    payoutDestination: withdrawal.payoutDestination || null,
    rejectionReason: withdrawal.rejectionReason || "",
    failureReason: withdrawal.failureReason || "",
    requestedAt: withdrawal.createdAt || null,
    reviewedAt: withdrawal.reviewedAt || null,
    approvedAt: withdrawal.approvedAt || null,
    rejectedAt: withdrawal.rejectedAt || null,
    completedAt: withdrawal.completedAt || withdrawal.paidAt || null,
    createdAt: withdrawal.createdAt || null,
    updatedAt: withdrawal.updatedAt || null,
  };
}

