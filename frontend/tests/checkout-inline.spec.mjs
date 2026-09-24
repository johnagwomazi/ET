import { expect, test } from "@playwright/test";

const checkoutSelection = {
  eventId: "64b64b64b64b64b64b64b710",
  eventName: "Inline Checkout Test",
  idempotencyKey: "checkout-inline-browser-test",
  items: [
    {
      ticketTypeId: "64b64b64b64b64b64b64b711",
      name: "General admission",
      quantity: 1,
      price: 5000,
      currency: "NGN",
    },
  ],
};

function apiResponse(data) {
  return { success: true, message: "Operation successful", data };
}

async function prepareCheckout(page, outcome) {
  const requests = [];

  await page.addInitScript(({ selection, popupOutcome }) => {
    window.sessionStorage.setItem("events_checkout_selection", JSON.stringify(selection));
    window.__PAYSTACK_TEST_OUTCOME__ = popupOutcome;
  }, { selection: checkoutSelection, popupOutcome: outcome });

  await page.route("**/*", async (route) => {
    const decodedUrl = decodeURIComponent(route.request().url());
    if (!decodedUrl.includes("@paystack_inline-js.js") && !decodedUrl.includes("@paystack/inline-js")) {
      return route.continue();
    }

    await route.fulfill({
      contentType: "application/javascript",
      body: `
        export default class PaystackPop {
          resumeTransaction(accessCode, callbacks) {
            window.__PAYSTACK_ACCESS_CODE__ = accessCode;
            window.__PAYSTACK_RESUME_CALLS__ = (window.__PAYSTACK_RESUME_CALLS__ || 0) + 1;
            setTimeout(() => {
              if (window.__PAYSTACK_TEST_OUTCOME__ === "success") {
                callbacks.onSuccess?.({ reference: "pay_inline_test", status: "success" });
              } else if (window.__PAYSTACK_TEST_OUTCOME__ === "cancelled") {
                callbacks.onCancel?.();
              } else {
                callbacks.onError?.({ message: "Paystack popup failed to load." });
              }
            }, 0);
            return {};
          }
        }
      `,
    });
  });

  await page.route("http://api.test/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api", "");
    const method = request.method();
    const body = request.postDataJSON?.() || null;
    requests.push({ method, path, body });

    if (path === "/auth/me") {
      return route.fulfill({
        json: apiResponse({
          user: {
            _id: "64b64b64b64b64b64b64b701",
            firstName: "Ada",
            lastName: "Buyer",
            email: "ada@example.com",
            role: "CUSTOMER",
            accountStatus: "ACTIVE",
          },
          organizationPermissions: [],
        }),
      });
    }

    if (path === "/notifications/unread-count") {
      return route.fulfill({ json: apiResponse({ unreadCount: 0 }) });
    }

    if (path === "/ticketing/checkout" && method === "POST") {
      return route.fulfill({
        status: 201,
        json: apiResponse({
          order: {
            reference: "ord_inline_test",
            paymentStatus: "INITIALIZED",
            total: 5000,
            currency: "NGN",
          },
          payment: {
            reference: "pay_inline_test",
            authorizationUrl: "https://checkout.paystack.test/inline",
            accessCode: "access_inline_test",
          },
        }),
      });
    }

    if (path === "/ticketing/payments/verify" && method === "POST") {
      return route.fulfill({
        json: apiResponse({
          order: {
            reference: "ord_inline_test",
            paymentStatus: "PAID",
            total: 5000,
            currency: "NGN",
          },
        }),
      });
    }

    return route.fulfill({
      status: 404,
      json: { success: false, message: `Unexpected request: ${method} ${path}` },
    });
  });

  await page.goto("/checkout", { waitUntil: "commit" });
  await expect(page.getByRole("heading", { name: "Complete your order" })).toBeVisible();
  await page.getByLabel("Phone").nth(0).fill("+2348012345678");
  await page.getByLabel("Phone").nth(1).fill("+2348012345678");

  return requests;
}

test("successful inline checkout verifies the existing order without leaving the site", async ({ page }) => {
  const requests = await prepareCheckout(page, "success");

  await page.getByRole("button", { name: "Pay securely with Paystack" }).click();

  await expect(page).toHaveURL(/\/payment\/confirmation\?reference=pay_inline_test$/);
  await expect(page.getByText("Payment verified")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__PAYSTACK_ACCESS_CODE__)).toBe("access_inline_test");

  const checkoutRequest = requests.find((request) => request.path === "/ticketing/checkout");
  const verificationRequest = requests.find((request) => request.path === "/ticketing/payments/verify");
  expect(checkoutRequest.body.idempotencyKey).toBe(checkoutSelection.idempotencyKey);
  expect(verificationRequest.body).toEqual({ reference: "pay_inline_test" });
  expect(page.url()).toMatch(/^http:\/\/127\.0\.0\.1:4174\//);
});

test("failed inline checkout stays recoverable and does not verify or redirect", async ({ page }) => {
  const requests = await prepareCheckout(page, "failed");

  await page.getByRole("button", { name: "Pay securely with Paystack" }).click();

  await expect(page.getByRole("alert")).toContainText("Paystack popup failed to load. No charge was made. Please try again.");
  await expect(page.getByRole("button", { name: "Pay securely with Paystack" })).toBeEnabled();
  expect(requests.filter((request) => request.path === "/ticketing/payments/verify")).toHaveLength(0);
  expect(page.url()).toBe("http://127.0.0.1:4174/checkout");
});

test("cancelled inline checkout remains on the responsive checkout and can retry the same order", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = await prepareCheckout(page, "cancelled");
  const payButton = page.getByRole("button", { name: "Pay securely with Paystack" });

  await payButton.click();
  await expect(page.getByText("Payment was cancelled. Your ticket has not been issued, and you can try again when ready.")).toBeVisible();
  await expect(payButton).toBeEnabled();

  await payButton.click();
  await expect.poll(() => page.evaluate(() => window.__PAYSTACK_RESUME_CALLS__)).toBe(2);

  const checkoutRequests = requests.filter((request) => request.path === "/ticketing/checkout");
  expect(checkoutRequests).toHaveLength(2);
  expect(checkoutRequests.map((request) => request.body.idempotencyKey)).toEqual([
    checkoutSelection.idempotencyKey,
    checkoutSelection.idempotencyKey,
  ]);
  expect(requests.filter((request) => request.path === "/ticketing/payments/verify")).toHaveLength(0);

  const buttonBox = await payButton.boundingBox();
  expect(buttonBox.x).toBeGreaterThanOrEqual(0);
  expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(390);
  expect(page.url()).toBe("http://127.0.0.1:4174/checkout");
});
