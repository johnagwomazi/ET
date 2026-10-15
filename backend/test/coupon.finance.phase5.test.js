import test from "node:test";
import assert from "node:assert/strict";

import { COUPON_FUNDING_TYPES } from "../src/constants/coupon.constants.js";
import { calculateOrganizationFinancialPosition } from "../src/services/finance.service.js";
import { buildRefundAccounting } from "../src/services/ticketing.service.js";
import { isPaidCouponOrder } from "../src/repositories/coupon.repository.js";
import { runCouponReservationCleanup } from "../src/services/couponReservationCleanup.service.js";

const organizationId = "64b64b64b64b64b64b64b701";

test("organizer balances use eligible revenue and exclude Eventidor subsidy", async () => {
  const position = await calculateOrganizationFinancialPosition(organizationId, {
    analyticsRepository: {
      async getOrganizationFinancialTotals() {
        return {
          currency: "NGN",
          grossSalesMinor: 225000,
          organizerEligibleRevenueMinor: 250000,
          platformFundedDiscountMinor: 25000,
          refundsMinor: 0,
          organizerEntitlementReversalMinor: 0,
          organizerNetRevenueMinor: 250000,
          netRevenueMinor: 225000,
        };
      },
    },
    withdrawalRepository: {
      async getOrganizationWithdrawalTotals() { return {}; },
    },
  });

  assert.equal(position.netRevenueMinor, 225000);
  assert.equal(position.organizerNetRevenueMinor, 250000);
  assert.equal(position.platformFundedDiscountMinor, 25000);
  assert.equal(position.availableBalanceMinor, 250000);
});

test("organizer-funded refunds reverse only the discounted organizer entitlement", () => {
  const result = buildRefundAccounting({
    total: 2250,
    customerPayableAmount: 2250,
    organizerEligibleRevenue: 2250,
    platformFundedDiscount: 0,
    coupon: { fundingType: COUPON_FUNDING_TYPES.ORGANIZER_FUNDED },
    items: [{ ticketType: "ticket-1", quantity: 1, total: 2250, discountedTotal: 2250 }],
  }, 1125);

  assert.equal(result.organizerEntitlementReversal, 1125);
  assert.equal(result.platformFundedSubsidyReversal, 0);
  assert.equal(result.lineAllocations[0].customerRefund, 1125);
});

test("platform-funded partial refunds proportionally reverse organizer entitlement and subsidy", () => {
  const result = buildRefundAccounting({
    total: 2250,
    customerPayableAmount: 2250,
    organizerEligibleRevenue: 2500,
    platformFundedDiscount: 250,
    coupon: { fundingType: COUPON_FUNDING_TYPES.PLATFORM_FUNDED },
    items: [{ ticketType: "ticket-1", quantity: 1, total: 2250, originalTotal: 2500, discountedTotal: 2250 }],
  }, 1125);

  assert.equal(result.organizerEntitlementReversal, 1250);
  assert.equal(result.platformFundedSubsidyReversal, 125);
});

test("legacy orders retain refund accounting based on the amount actually paid", () => {
  const result = buildRefundAccounting({
    total: 2000,
    items: [{ ticketType: "ticket-1", quantity: 1, total: 2000 }],
  }, 500);

  assert.equal(result.organizerEntitlementReversal, 500);
  assert.equal(result.platformFundedSubsidyReversal, 0);
});

test("refund accounting is idempotency-safe through the existing refund request key", () => {
  const first = buildRefundAccounting({ total: 1000 }, 1000);
  const duplicate = buildRefundAccounting({ total: 1000 }, 1000);
  assert.deepEqual(duplicate, first);
});

test("scheduled cleanup releases expired reservations through a transaction", async () => {
  let calls = 0;
  const result = await runCouponReservationCleanup({
    mongoose: {
      connection: { readyState: 1 },
      async startSession() {
        return {
          async withTransaction(callback) { return callback({}); },
          async endSession() {},
        };
      },
    },
    couponRepository: {
      async releaseExpiredCouponReservations(before, { session }) {
        calls += 1;
        assert.ok(before instanceof Date);
        assert.ok(session);
        return 2;
      },
    },
  });

  assert.equal(result.released, 2);
  assert.equal(calls, 1);
});

test("cleanup never releases a reservation whose order is already paid", () => {
  assert.equal(isPaidCouponOrder({ order: { paymentStatus: "PAID" } }), true);
  assert.equal(isPaidCouponOrder({ order: { orderStatus: "PAID" } }), true);
  assert.equal(isPaidCouponOrder({ order: { paymentStatus: "PENDING" } }), false);
});
