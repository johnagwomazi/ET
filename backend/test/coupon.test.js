import assert from "node:assert/strict";
import test from "node:test";
import { COUPON_FUNDING_TYPES } from "../src/constants/coupon.constants.js";
import { couponCreateSchema } from "../src/validators/coupon.validator.js";
import * as couponService from "../src/services/coupon.service.js";
import { calculateCouponPricing } from "../src/services/couponPricing.service.js";

const organizationId = "64b64b64b64b64b64b64b640";
const eventId = "64b64b64b64b64b64b64b641";
const ticketTypeId = "64b64b64b64b64b64b64b642";
const adminId = "64b64b64b64b64b64b64b643";
const superAdminId = "64b64b64b64b64b64b64b644";
const managerId = "64b64b64b64b64b64b64b645";

function dependencies() {
  return {
    authRepository: {
      async findAuthUserById(id) {
        if (id === superAdminId) return { _id: id, role: "SUPER_ADMIN", organization: null };
        if (id === adminId) return { _id: id, role: "ADMIN", organization: organizationId };
        if (id === managerId) return { _id: id, role: "MANAGER", organization: organizationId };
        return null;
      },
    },
    eventRepository: {
      async findEventByIdAndOrganization(id, organization) {
        return id === eventId && organization === organizationId ? { _id: id } : null;
      },
      async findPublicEventById(id) {
        return id === eventId ? { _id: id } : null;
      },
    },
    ticketTypeRepository: {
      async findTicketTypeByIdAndEvent(ticketType, event, organization) {
        return ticketType === ticketTypeId && event === eventId && organization === organizationId ? { _id: ticketType } : null;
      },
      async findTicketTypes(filter) {
        return filter._id === ticketTypeId && filter.event === eventId ? [{ _id: ticketTypeId }] : [];
      },
    },
    couponRepository: {
      async createCoupon(data) { return { _id: "64b64b64b64b64b64b64b646", ...data }; },
    },
  };
}

test("coupon validation accepts decimal percentages and rejects invalid date ranges", () => {
  const valid = couponCreateSchema.safeParse({
    fundingType: COUPON_FUNDING_TYPES.PLATFORM_FUNDED,
    discountPercent: 12.5,
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-02-01T00:00:00.000Z",
  });
  assert.equal(valid.success, true);

  const invalid = couponCreateSchema.safeParse({
    fundingType: COUPON_FUNDING_TYPES.PLATFORM_FUNDED,
    discountPercent: 0,
    startsAt: "2026-02-01T00:00:00.000Z",
    endsAt: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(invalid.success, false);
});

test("coupon codes are normalized and generated codes are secure-looking", async () => {
  const result = await couponService.createCoupon(
    superAdminId,
    null,
    { fundingType: COUPON_FUNDING_TYPES.PLATFORM_FUNDED, code: "spring-sale", discountPercent: 10 },
    dependencies()
  );
  assert.equal(result.coupon.code, "SPRING-SALE");

  const generated = couponService.generateCouponCode();
  assert.match(generated, /^EVT-[A-F0-9]{16}$/);
});

test("authorization separates platform and organizer coupons", async () => {
  const organizer = await couponService.createCoupon(
    adminId,
    organizationId,
    { fundingType: COUPON_FUNDING_TYPES.ORGANIZER_FUNDED, discountPercent: 25, eventId, ticketTypeIds: [ticketTypeId] },
    dependencies()
  );
  assert.equal(organizer.coupon.organization, organizationId);

  const manager = await couponService.createCoupon(
    managerId,
    organizationId,
    { fundingType: COUPON_FUNDING_TYPES.ORGANIZER_FUNDED, discountPercent: 25, eventId },
    dependencies()
  );
  assert.equal(manager.statusCode, 403);

  const wrongOrganization = await couponService.createCoupon(
    adminId,
    "64b64b64b64b64b64b64b647",
    { fundingType: COUPON_FUNDING_TYPES.ORGANIZER_FUNDED, discountPercent: 25, eventId },
    dependencies()
  );
  assert.equal(wrongOrganization.statusCode, 403);
});

function pricingDependencies(coupon) {
  return {
    couponRepository: {
      async findCouponByCode() { return coupon; },
      async countCouponRedemptions() { return 0; },
    },
    ticketTypeRepository: {
      async findTicketTypeByIdAndEvent(id) {
        return {
          _id: id,
          name: id === ticketTypeId ? "Standard" : "Premium",
          price: id === ticketTypeId ? 1.00 : 1.01,
        };
      },
    },
  };
}

test("platform-funded coupons preserve organizer revenue and discount only eligible lines", async () => {
  const result = await calculateCouponPricing({
    couponCode: "platform",
    customerId: adminId,
    eventId,
    organizationId,
    items: [{ ticketTypeId, quantity: 1 }, { ticketTypeId: "premium", quantity: 2 }],
  }, pricingDependencies({
    _id: "64b64b64b64b64b64b64b648",
    code: "PLATFORM",
    fundingType: COUPON_FUNDING_TYPES.PLATFORM_FUNDED,
    discountPercent: 12.5,
    event: eventId,
    ticketTypes: [ticketTypeId],
    customers: [],
    status: "ACTIVE",
    redemptionCount: 0,
  }));

  assert.equal(result.originalSubtotalMinor, 302);
  assert.equal(result.discountAmountMinor, 13);
  assert.equal(result.customerPayableAmountMinor, 289);
  assert.equal(result.platformFundedDiscountMinor, 13);
  assert.equal(result.organizerEligibleRevenueMinor, 302);
  assert.equal(result.items[0].couponEligible, true);
  assert.equal(result.items[1].couponEligible, false);
});

test("organizer-funded decimal discounts use deterministic per-line kobo rounding", async () => {
  const result = await calculateCouponPricing({
    coupon: {
      _id: "64b64b64b64b64b64b64b649",
      code: "DECIMAL",
      fundingType: COUPON_FUNDING_TYPES.ORGANIZER_FUNDED,
      discountPercent: 33.333,
      event: eventId,
      ticketTypes: [],
      customers: [adminId],
      status: "ACTIVE",
      redemptionCount: 0,
    },
    customerId: adminId,
    eventId,
    organizationId,
    items: [{ ticketTypeId, quantity: 1 }, { ticketTypeId: "premium", quantity: 1 }],
  }, pricingDependencies());

  assert.deepEqual(result.items.map((item) => item.discountAmountMinor), [33, 34]);
  assert.equal(result.discountAmountMinor, 67);
  assert.equal(result.customerPayableAmountMinor, 134);
  assert.equal(result.organizerEligibleRevenueMinor, 134);
});

test("100 percent discounts never produce negative totals and legacy orders price without coupons", async () => {
  const free = await calculateCouponPricing({
    coupon: {
      _id: "64b64b64b64b64b64b64b650",
      code: "FREE",
      fundingType: COUPON_FUNDING_TYPES.ORGANIZER_FUNDED,
      discountPercent: 100,
      event: eventId,
      ticketTypes: [],
      customers: [],
      status: "ACTIVE",
      redemptionCount: 0,
    },
    customerId: adminId,
    eventId,
    organizationId,
    items: [{ ticketTypeId, quantity: 2 }],
  }, pricingDependencies());
  assert.equal(free.customerPayableAmountMinor, 0);
  assert.equal(free.items[0].discountedTotalMinor, 0);

  const legacy = await calculateCouponPricing({
    customerId: adminId,
    eventId,
    organizationId,
    items: [{ ticketTypeId, quantity: 2 }],
  }, pricingDependencies(null));
  assert.equal(legacy.coupon, null);
  assert.equal(legacy.discountAmountMinor, 0);
  assert.equal(legacy.customerPayableAmountMinor, 200);
  assert.equal(legacy.organizerEligibleRevenueMinor, 200);
});

test("expired and customer-restricted coupons are rejected", async () => {
  await assert.rejects(
    calculateCouponPricing({
      coupon: {
        code: "EXPIRED",
        fundingType: COUPON_FUNDING_TYPES.PLATFORM_FUNDED,
        discountPercent: 10,
        startsAt: new Date("2020-01-01"),
        endsAt: new Date("2020-02-01"),
        status: "ACTIVE",
        redemptionCount: 0,
        customers: [],
        ticketTypes: [],
      },
      customerId: adminId,
      eventId,
      organizationId,
      items: [{ ticketTypeId, quantity: 1 }],
    }, pricingDependencies()),
    (error) => error.code === "COUPON_NOT_ELIGIBLE"
  );
});

test("reward coupons require an issued customer reward and cannot be applied retroactively", async () => {
  const rewardCoupon = {
    _id: "64b64b64b64b64b64b64b651",
    code: "REWARD5",
    fundingType: COUPON_FUNDING_TYPES.PLATFORM_FUNDED,
    discountPercent: 20,
    event: eventId,
    ticketTypes: [],
    customers: [],
    status: "ACTIVE",
    redemptionCount: 0,
    rewardRule: { qualifyingTicketCount: 5, nextPurchaseOnly: true },
  };
  const deps = {
    ...pricingDependencies(rewardCoupon),
    couponRewardRepository: {
      async findRewardByCustomerAndCoupon() { return null; },
    },
  };
  await assert.rejects(
    calculateCouponPricing({ couponCode: "REWARD5", customerId: adminId, eventId, organizationId, items: [{ ticketTypeId, quantity: 1 }] }, deps),
    (error) => error.code === "COUPON_NOT_ELIGIBLE"
  );
  deps.couponRewardRepository.findRewardByCustomerAndCoupon = async () => ({ _id: "reward-1" });
  const result = await calculateCouponPricing({ couponCode: "REWARD5", customerId: adminId, eventId, organizationId, items: [{ ticketTypeId, quantity: 1 }] }, deps);
  assert.equal(result.discountAmountMinor, 20);
});

test("successful qualifying orders issue a reward once even when payment completion is retried", async () => {
  let attempts = 0;
  const dependencies = {
    couponRepository: {
      async findRewardCoupons() {
        return [{ _id: "64b64b64b64b64b64b64b652", event: eventId, customers: [], rewardRule: { qualifyingTicketCount: 5 } }];
      },
    },
    couponRewardRepository: {
      async createCouponReward() {
        attempts += 1;
        if (attempts > 1) throw Object.assign(new Error("duplicate"), { code: 11000 });
        return { _id: "reward-1" };
      },
    },
  };
  const order = { _id: "64b64b64b64b64b64b64b653", customer: adminId, event: eventId, paymentStatus: "PAID", items: [{ quantity: 5 }] };
  assert.equal((await couponService.issueRewardsForPaidOrder(order, dependencies)).length, 1);
  assert.equal((await couponService.issueRewardsForPaidOrder(order, dependencies)).length, 0);
  assert.equal(attempts, 2);
});
