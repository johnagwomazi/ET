import test from "node:test";
import assert from "node:assert/strict";

import { USER_ROLES } from "../src/constants/roles.constants.js";
import { WITHDRAWAL_STATUS } from "../src/constants/ticketing.constants.js";
import * as financeService from "../src/services/finance.service.js";
import * as ticketingService from "../src/services/ticketing.service.js";
import {
  payoutDetailsUpdateSchema,
  platformWithdrawalListQuerySchema,
  withdrawalCreateSchema,
  withdrawalRejectSchema,
} from "../src/validators/finance.validator.js";
import Organization from "../src/models/organization.model.js";
import Withdrawal from "../src/models/withdrawal.model.js";
import organizationRoutes from "../src/routes/organization.routes.js";
import adminRoutes from "../src/routes/admin.routes.js";

const ids = {
  admin: "64b64b64b64b64b64b64b701",
  manager: "64b64b64b64b64b64b64b702",
  customer: "64b64b64b64b64b64b64b703",
  superAdmin: "64b64b64b64b64b64b64b704",
  organization: "64b64b64b64b64b64b64b705",
  otherOrganization: "64b64b64b64b64b64b64b706",
  withdrawal: "64b64b64b64b64b64b64b707",
};

function createDependencies(options = {}) {
  const state = {
    lockToken: null,
    transferCount: 0,
    revenue: options.revenue || {
      currency: "NGN",
      grossSalesMinor: 100_000,
      refundsMinor: 10_000,
      netRevenueMinor: 90_000,
    },
    organization: {
      _id: ids.organization,
      organizationName: "Acme Events",
      status: "APPROVED",
      isDeleted: false,
      payoutDetails: options.payoutConfigured === false ? {} : {
        accountName: "Acme Events Ltd",
        accountNumberLast4: "6789",
        bankCode: "058",
        bankName: "Test Bank",
        currency: "NGN",
        recipientCode: "RCP_phase7",
      },
      ...(options.organization || {}),
    },
    withdrawals: (options.withdrawals || []).map((withdrawal, index) => ({
      _id: withdrawal._id || (index === 0 ? ids.withdrawal : `64b64b64b64b64b64b64b7${10 + index}`),
      reference: withdrawal.reference || `wd_${index}`,
      organization: ids.organization,
      requestedBy: ids.admin,
      amount: withdrawal.amount ?? 100,
      amountMinor: withdrawal.amountMinor ?? Math.round((withdrawal.amount ?? 100) * 100),
      currency: "NGN",
      status: WITHDRAWAL_STATUS.PENDING,
      transferStatus: "NOT_STARTED",
      createdAt: new Date("2026-09-04T10:00:00.000Z"),
      ...withdrawal,
    })),
  };

  function getActor(userId) {
    if (userId === ids.superAdmin) {
      return { _id: userId, role: USER_ROLES.SUPER_ADMIN, accountStatus: "ACTIVE" };
    }
    if (userId === ids.manager) {
      return { _id: userId, role: USER_ROLES.MANAGER, organization: ids.organization, accountStatus: "ACTIVE" };
    }
    if (userId === ids.customer) {
      return { _id: userId, role: USER_ROLES.CUSTOMER, accountStatus: "ACTIVE" };
    }
    return {
      _id: userId,
      role: USER_ROLES.ADMIN,
      organization: options.actorOrganization || ids.organization,
      accountStatus: options.accountStatus || "ACTIVE",
    };
  }

  const dependencies = {
    authRepository: { async findAuthUserById(userId) { return getActor(userId); } },
    analyticsRepository: {
      async getOrganizationFinancialTotals() { return state.revenue; },
    },
    organizationRepository: {
      async findOrganizationWithPayoutDetailsById(organizationId) {
        return organizationId === ids.organization ? state.organization : null;
      },
      async acquireOrganizationFinanceLock(organizationId, token) {
        if (organizationId !== ids.organization || state.lockToken) return null;
        state.lockToken = token;
        return state.organization;
      },
      async releaseOrganizationFinanceLock(organizationId, token) {
        if (organizationId === ids.organization && state.lockToken === token) state.lockToken = null;
      },
      async updateOrganizationPayoutDetails(organizationId, payoutDetails) {
        state.organization.payoutDetails = payoutDetails;
        return state.organization;
      },
    },
    withdrawalRepository: {
      async getOrganizationWithdrawalTotals() {
        const totals = {};
        for (const withdrawal of state.withdrawals) {
          totals[withdrawal.status] ||= { amountMinor: 0, count: 0 };
          totals[withdrawal.status].amountMinor += withdrawal.amountMinor;
          totals[withdrawal.status].count += 1;
        }
        return totals;
      },
      async createWithdrawal(data) {
        if (options.createDelay) await new Promise((resolve) => setTimeout(resolve, options.createDelay));
        const withdrawal = { _id: `64b64b64b64b64b64b64b7${20 + state.withdrawals.length}`, createdAt: new Date(), ...data };
        state.withdrawals.push(withdrawal);
        return withdrawal;
      },
      async findWithdrawalById(withdrawalId) {
        return state.withdrawals.find((withdrawal) => withdrawal._id === withdrawalId) || null;
      },
      async findWithdrawalByTransferReference(reference) {
        return state.withdrawals.find((withdrawal) => withdrawal.transferReference === reference) || null;
      },
      async findWithdrawals(filter = {}, pagination = {}) {
        return state.withdrawals.filter((withdrawal) =>
          (!filter.organization || withdrawal.organization === filter.organization) &&
          (!filter.status || withdrawal.status === filter.status)
        ).slice(pagination.skip || 0, (pagination.skip || 0) + (pagination.limit || 20));
      },
      async countWithdrawals(filter = {}) {
        return state.withdrawals.filter((withdrawal) =>
          (!filter.organization || withdrawal.organization === filter.organization) &&
          (!filter.status || withdrawal.status === filter.status)
        ).length;
      },
      async updateWithdrawalByStatus(withdrawalId, statuses, update) {
        const withdrawal = state.withdrawals.find((item) => item._id === withdrawalId);
        if (!withdrawal || !statuses.includes(withdrawal.status)) return null;
        Object.assign(withdrawal, update, { updatedAt: new Date() });
        return withdrawal;
      },
    },
    paystackService: {
      isConfigured() { return options.paystackConfigured !== false; },
      async resolveAccountNumber() {
        return { status: true, data: { account_name: "Acme Events Ltd", account_number: "0123456789" } };
      },
      async createTransferRecipient() {
        return {
          status: true,
          data: {
            recipient_code: "RCP_phase7",
            currency: "NGN",
            details: { account_name: "Acme Events Ltd", bank_code: "058", bank_name: "Test Bank" },
          },
        };
      },
      async initiateTransfer() {
        state.transferCount += 1;
        if (options.transferDelay) await new Promise((resolve) => setTimeout(resolve, options.transferDelay));
        if (options.transferThrows) throw new Error("timeout");
        if (options.transferFails) return { configured: true, status: false, message: "Insufficient provider balance" };
        return {
          configured: true,
          status: true,
          data: { status: options.transferStatus || "pending", transfer_code: "TRF_phase7" },
        };
      },
      async verifyTransfer(reference) {
        return {
          status: true,
          data: {
            status: options.verifyStatus || "success",
            amount: state.withdrawals[0].amountMinor,
            currency: "NGN",
            reference,
            transfer_code: "TRF_phase7",
          },
        };
      },
    },
  };

  return { dependencies, state };
}

test("Phase 7 validators reject unsafe money, payout, filter, and review payloads", () => {
  assert.equal(withdrawalCreateSchema.safeParse({ amount: 1000.25 }).success, true);
  assert.equal(withdrawalCreateSchema.safeParse({ amount: 0 }).success, false);
  assert.equal(withdrawalCreateSchema.safeParse({ amount: 1.001 }).success, false);
  assert.equal(withdrawalCreateSchema.safeParse({ amount: 100, availableBalance: 1000 }).success, false);
  assert.equal(payoutDetailsUpdateSchema.safeParse({ accountNumber: "0123456789", bankCode: "058" }).success, true);
  assert.equal(payoutDetailsUpdateSchema.safeParse({ accountNumber: "123", bankCode: "$where" }).success, false);
  assert.equal(withdrawalRejectSchema.safeParse({ reason: "" }).success, false);
  assert.equal(platformWithdrawalListQuerySchema.safeParse({ organizationId: { $ne: null } }).success, false);
});

test("financial summary uses Phase 6 minor-unit revenue and reserves only active withdrawals", async () => {
  const { dependencies } = createDependencies({
    withdrawals: [
      { status: WITHDRAWAL_STATUS.PENDING, amountMinor: 20_000 },
      { status: WITHDRAWAL_STATUS.PAID, amountMinor: 30_000 },
      { status: WITHDRAWAL_STATUS.REJECTED, amountMinor: 50_000 },
      { status: WITHDRAWAL_STATUS.FAILED, amountMinor: 50_000 },
    ],
  });
  const summary = await financeService.getOrganizationFinanceSummary(ids.organization, ids.admin, dependencies);
  assert.equal(summary.grossSales, 1000);
  assert.equal(summary.refunds, 100);
  assert.equal(summary.netRevenue, 900);
  assert.equal(summary.completedWithdrawals, 300);
  assert.equal(summary.pendingWithdrawals, 200);
  assert.equal(summary.availableBalance, 400);
});

test("no successful sales produces a zero available balance", async () => {
  const { dependencies } = createDependencies({
    revenue: { currency: "NGN", grossSalesMinor: 0, refundsMinor: 0, netRevenueMinor: 0 },
  });
  const summary = await financeService.getOrganizationFinanceSummary(ids.organization, ids.admin, dependencies);
  assert.equal(summary.availableBalance, 0);
});

test("only an active organization Admin can access organization finance", async () => {
  const manager = await financeService.getOrganizationFinanceSummary(ids.organization, ids.manager, createDependencies().dependencies);
  const customer = await financeService.getOrganizationFinanceSummary(ids.organization, ids.customer, createDependencies().dependencies);
  const cross = await financeService.getOrganizationFinanceSummary(
    ids.organization,
    ids.admin,
    createDependencies({ actorOrganization: ids.otherOrganization }).dependencies
  );
  const suspended = await financeService.getOrganizationFinanceSummary(
    ids.organization,
    ids.admin,
    createDependencies({ accountStatus: "SUSPENDED" }).dependencies
  );
  const inactiveOrganization = await financeService.getOrganizationFinanceSummary(
    ids.organization,
    ids.admin,
    createDependencies({ organization: { status: "SUSPENDED" } }).dependencies
  );
  assert.equal(manager.statusCode, 403);
  assert.equal(customer.statusCode, 403);
  assert.equal(cross.statusCode, 403);
  assert.equal(suspended.statusCode, 401);
  assert.equal(inactiveOrganization.statusCode, 403);
});

test("payout details are provider-verified and only a masked account is returned", async () => {
  const { dependencies, state } = createDependencies({ payoutConfigured: false });
  const result = await financeService.updateOrganizationPayoutDetails(
    ids.organization,
    ids.admin,
    { accountNumber: "0123456789", bankCode: "058" },
    dependencies
  );
  assert.equal(result.payoutDestination.accountNumberMasked, "******6789");
  assert.equal(result.payoutDestination.configured, true);
  assert.equal(state.organization.payoutDetails.accountNumber, undefined);
});

test("simultaneous requests cannot over-reserve organization revenue", async () => {
  const { dependencies, state } = createDependencies({
    revenue: { currency: "NGN", grossSalesMinor: 100_000, refundsMinor: 0, netRevenueMinor: 100_000 },
    createDelay: 40,
  });
  const [first, second] = await Promise.all([
    financeService.requestWithdrawal(ids.organization, ids.admin, { amount: 700, currency: "NGN" }, dependencies),
    financeService.requestWithdrawal(ids.organization, ids.admin, { amount: 700, currency: "NGN" }, dependencies),
  ]);
  const results = [first, second];
  assert.equal(results.filter((result) => result.withdrawal).length, 1);
  assert.equal(results.filter((result) => result.statusCode === 400).length, 1);
  assert.equal(state.withdrawals.length, 1);
});

test("a withdrawal request requires a verified organization payout destination", async () => {
  const result = await financeService.requestWithdrawal(
    ids.organization,
    ids.admin,
    { amount: 100 },
    createDependencies({ payoutConfigured: false }).dependencies
  );
  assert.equal(result.statusCode, 400);
  assert.match(result.error, /payout account/i);
});

test("duplicate concurrent approvals initiate exactly one provider transfer", async () => {
  const { dependencies, state } = createDependencies({
    withdrawals: [{ _id: ids.withdrawal, amount: 400, amountMinor: 40_000 }],
    transferDelay: 40,
  });
  const [first, second] = await Promise.all([
    financeService.approveWithdrawal(ids.withdrawal, ids.superAdmin, {}, dependencies),
    financeService.approveWithdrawal(ids.withdrawal, ids.superAdmin, {}, dependencies),
  ]);
  assert.equal(state.transferCount, 1);
  assert.equal(state.withdrawals[0].status, WITHDRAWAL_STATUS.PROCESSING);
  assert.ok(first.withdrawal || second.withdrawal);
  assert.ok(first.idempotent || second.idempotent);
});

test("provider failure releases the reservation while timeout remains processing for reconciliation", async () => {
  const failedSetup = createDependencies({
    withdrawals: [{ _id: ids.withdrawal, amount: 400, amountMinor: 40_000 }],
    transferFails: true,
  });
  const failed = await financeService.approveWithdrawal(ids.withdrawal, ids.superAdmin, {}, failedSetup.dependencies);
  const failedBalance = await financeService.getOrganizationFinanceSummary(ids.organization, ids.admin, failedSetup.dependencies);
  assert.equal(failed.withdrawal.status, WITHDRAWAL_STATUS.FAILED);
  assert.equal(failedBalance.availableBalance, 900);

  const unknownSetup = createDependencies({
    withdrawals: [{ _id: ids.withdrawal, amount: 400, amountMinor: 40_000 }],
    transferThrows: true,
  });
  const unknown = await financeService.approveWithdrawal(ids.withdrawal, ids.superAdmin, {}, unknownSetup.dependencies);
  assert.equal(unknown.withdrawal.status, WITHDRAWAL_STATUS.PROCESSING);
  assert.equal(unknown.withdrawal.transferStatus, "UNKNOWN");
  assert.equal(unknown.reconciliationRequired, true);
});

test("rejection is audited and releases reserved funds", async () => {
  const { dependencies } = createDependencies({
    withdrawals: [{ _id: ids.withdrawal, amount: 400, amountMinor: 40_000 }],
  });
  const result = await financeService.rejectWithdrawal(ids.withdrawal, ids.superAdmin, "Bank details need review", dependencies);
  const summary = await financeService.getOrganizationFinanceSummary(ids.organization, ids.admin, dependencies);
  assert.equal(result.withdrawal.status, WITHDRAWAL_STATUS.REJECTED);
  assert.equal(result.withdrawal.rejectionReason, "Bank details need review");
  assert.equal(result.withdrawal.reviewedBy, ids.superAdmin);
  assert.equal(summary.availableBalance, 900);
});

test("verified transfer webhook completion and reconciliation are idempotent", async () => {
  const setup = createDependencies({
    withdrawals: [{
      _id: ids.withdrawal,
      amount: 400,
      amountMinor: 40_000,
      status: WITHDRAWAL_STATUS.PROCESSING,
      transferReference: "trf_wd_phase7",
      transferStatus: "PROCESSING",
    }],
  });
  const webhook = await financeService.handleTransferWebhook(
    "transfer.success",
    { reference: "trf_wd_phase7", status: "success", transfer_code: "TRF_phase7" },
    setup.dependencies
  );
  const duplicate = await financeService.handleTransferWebhook(
    "transfer.success",
    { reference: "trf_wd_phase7", status: "success" },
    setup.dependencies
  );
  assert.equal(webhook.withdrawal.status, WITHDRAWAL_STATUS.PAID);
  assert.equal(duplicate.duplicate, true);

  const reconcileSetup = createDependencies({
    withdrawals: [{
      _id: ids.withdrawal,
      amount: 400,
      amountMinor: 40_000,
      status: WITHDRAWAL_STATUS.PROCESSING,
      transferReference: "trf_wd_phase7",
      transferStatus: "UNKNOWN",
    }],
  });
  const reconciled = await financeService.reconcileWithdrawal(ids.withdrawal, ids.superAdmin, reconcileSetup.dependencies);
  assert.equal(reconciled.withdrawal.status, WITHDRAWAL_STATUS.PAID);
});

test("duplicate Paystack transfer webhooks safely resume finance processing", async () => {
  let eventWrites = 0;
  let transferHandlerCalls = 0;
  const dependencies = {
    paystackService: { verifyWebhookSignature() { return true; } },
    paymentEventRepository: {
      async createPaymentEvent() {
        eventWrites += 1;
        if (eventWrites > 1) {
          const error = new Error("duplicate");
          error.code = 11000;
          throw error;
        }
      },
    },
    financeService: {
      async handleTransferWebhook() {
        transferHandlerCalls += 1;
        return { processed: true };
      },
    },
  };
  const payload = { event: "transfer.success", data: { reference: "trf_wd_phase7" } };
  await ticketingService.handlePaystackWebhook(Buffer.from("signed"), "signature", payload, dependencies);
  await ticketingService.handlePaystackWebhook(Buffer.from("signed"), "signature", payload, dependencies);
  assert.equal(transferHandlerCalls, 2);
});

test("a provider reversal releases a previously completed withdrawal", async () => {
  const setup = createDependencies({
    withdrawals: [{
      _id: ids.withdrawal,
      amount: 400,
      amountMinor: 40_000,
      status: WITHDRAWAL_STATUS.PAID,
      transferReference: "trf_wd_reversed",
      transferStatus: "SUCCESS",
    }],
  });
  const result = await financeService.handleTransferWebhook(
    "transfer.reversed",
    { reference: "trf_wd_reversed", amount: 40_000, currency: "NGN", failures: [{ message: "Reversed" }] },
    setup.dependencies
  );
  const summary = await financeService.getOrganizationFinanceSummary(ids.organization, ids.admin, setup.dependencies);
  assert.equal(result.withdrawal.status, WITHDRAWAL_STATUS.FAILED);
  assert.equal(result.withdrawal.transferStatus, "REVERSED");
  assert.equal(summary.availableBalance, 900);
});

test("withdrawal indexes cover organization status, queue ordering, requester, and unique transfer references", () => {
  const indexes = Withdrawal.schema.indexes();
  assert.ok(indexes.some(([fields]) => fields.organization === 1 && fields.status === 1 && fields.createdAt === -1));
  assert.ok(indexes.some(([fields]) => fields.organization === 1 && fields.createdAt === -1 && fields.status === undefined));
  assert.ok(indexes.some(([fields]) => fields.status === 1 && fields.createdAt === -1));
  assert.ok(indexes.some(([fields]) => fields.requestedBy === 1 && fields.createdAt === -1));
  assert.ok(indexes.some(([fields, options]) => fields.transferReference === 1 && options.unique));
  assert.equal(Organization.schema.path("financeLock").options.select, false);
});

test("all Phase 7 routes are registered under protected organization and Super Admin routers", () => {
  const paths = (router) => router.stack.filter((layer) => layer.route).map((layer) => layer.route.path);
  assert.ok(paths(organizationRoutes).includes("/me/finance/summary"));
  assert.ok(paths(organizationRoutes).includes("/me/finance/payout-details"));
  assert.ok(paths(organizationRoutes).includes("/me/withdrawals"));
  assert.ok(paths(adminRoutes).includes("/withdrawals/:withdrawalId"));
  assert.ok(paths(adminRoutes).includes("/withdrawals/:withdrawalId/approve"));
  assert.ok(paths(adminRoutes).includes("/withdrawals/:withdrawalId/reconcile"));
});
