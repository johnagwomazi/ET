import { expect, test } from "@playwright/test";

const organizationId = "64b64b64b64b64b64b64b705";

function apiResponse(data) {
  return { success: true, message: "Operation successful", data };
}

async function installApiMocks(page, options = {}) {
  const requests = [];
  const state = {
    payoutDestination: {
      configured: false,
      verified: false,
      accountName: "",
      accountNumberMasked: "",
      bankName: "",
      currency: "NGN",
    },
  };

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
            lastName: "Admin",
            email: "ada@example.com",
            role: "ADMIN",
            accountStatus: "ACTIVE",
            organization: {
              _id: organizationId,
              organizationName: "Acme Events",
              status: "APPROVED",
            },
          },
          organizationPermissions: [
            "ORGANIZATION_VIEW",
            "ORGANIZATION_UPDATE",
            "DASHBOARD_VIEW",
            "SETTINGS_VIEW",
            "SETTINGS_UPDATE",
          ],
        }),
      });
    }

    if (path === "/notifications/unread-count") {
      return route.fulfill({ json: apiResponse({ unreadCount: 0 }) });
    }

    if (path === "/organizations/me/finance/summary") {
      return route.fulfill({
        json: apiResponse({
          currency: "NGN",
          grossSales: 500000,
          refunds: 0,
          netRevenue: 500000,
          completedWithdrawals: 0,
          pendingWithdrawals: 0,
          availableBalance: 500000,
          balanceDeficit: 0,
          payoutDestination: state.payoutDestination,
        }),
      });
    }

    if (path === "/organizations/me/withdrawals" && method === "GET") {
      return route.fulfill({
        json: apiResponse({
          withdrawals: [],
          pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
        }),
      });
    }

    if (path === "/organizations/me/finance/banks") {
      return route.fulfill({
        json: apiResponse({
          banks: [
            { name: "Access Bank", code: "044" },
            { name: "Guaranty Trust Bank", code: "058" },
          ],
        }),
      });
    }

    if (path === "/organizations/me/finance/payout-details/resolve") {
      if (options.resolveFails) {
        return route.fulfill({
          status: 400,
          json: { success: false, message: "Unable to verify this account. Check the bank and account number." },
        });
      }
      return route.fulfill({
        json: apiResponse({
          accountName: "ACME EVENTS LIMITED",
          bankName: "Guaranty Trust Bank",
          accountNumberMasked: "******6789",
          confirmationToken: "signed-confirmation",
        }),
      });
    }

    if (path === "/organizations/me/finance/payout-details" && method === "PUT") {
      state.payoutDestination = {
        configured: true,
        verified: true,
        accountName: "ACME EVENTS LIMITED",
        accountNumberMasked: "******6789",
        bankName: "Guaranty Trust Bank",
        currency: "NGN",
      };
      return route.fulfill({ json: apiResponse({ payoutDestination: state.payoutDestination }) });
    }

    if (path === "/organizations/me/withdrawals" && method === "POST") {
      return route.fulfill({
        status: 201,
        json: apiResponse({
          withdrawal: {
            id: "64b64b64b64b64b64b64b707",
            reference: "wd_browser_test",
            amount: body.amount,
            currency: "NGN",
            status: "PENDING",
            payoutDestination: {
              accountName: "ACME EVENTS LIMITED",
              accountNumberLast4: "6789",
              bankName: "Guaranty Trust Bank",
            },
          },
        }),
      });
    }

    return route.fulfill({ status: 404, json: { success: false, message: `Unexpected request: ${method} ${path}` } });
  });

  return { requests, state };
}

test("Admin resolves, confirms, saves, and withdraws to a saved commercial bank", async ({ page }) => {
  const { requests } = await installApiMocks(page);
  await page.goto("/organization/finance");

  const requestButton = page.getByRole("button", { name: "Request Withdrawal" });
  await expect(page.getByText("Configure and verify a bank account before requesting a withdrawal.")).toBeVisible();
  await expect(requestButton).toBeDisabled();

  await page.getByRole("button", { name: "Add bank account" }).click();
  await page.getByLabel("Bank").selectOption({ label: "Guaranty Trust Bank" });
  await page.getByLabel("Account number").fill("0123456789");
  await page.getByRole("button", { name: "Verify account" }).click();

  await expect(page.getByText("ACME EVENTS LIMITED")).toBeVisible();
  await expect(page.getByText("******6789")).toBeVisible();
  await expect(page.getByText(/recipient.?code|Paystack bank code/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Confirm and save account" }).click();

  await expect(page.getByText("Verified")).toBeVisible();
  await expect(page.getByText(/ACME EVENTS LIMITED.*Guaranty Trust Bank.*\*\*\*\*\*\*6789/)).toBeVisible();
  await expect(requestButton).toBeEnabled();
  await requestButton.click();
  await expect(page.getByText("Withdraw to")).toBeVisible();
  await expect(page.getByText("ACME EVENTS LIMITED")).toBeVisible();
  await page.getByLabel("Withdrawal amount").fill("250000");
  await page.getByRole("button", { name: "Submit request" }).click();

  const resolveRequest = requests.find((request) => request.path.endsWith("/resolve"));
  const saveRequest = requests.find((request) => request.method === "PUT");
  const withdrawalRequest = requests.find(
    (request) => request.path === "/organizations/me/withdrawals" && request.method === "POST"
  );
  expect(resolveRequest.body).toEqual({ accountNumber: "0123456789", bankCode: "058" });
  expect(saveRequest.body).toEqual({
    accountNumber: "0123456789",
    bankCode: "058",
    confirmationToken: "signed-confirmation",
  });
  expect(withdrawalRequest.body).toEqual({ amount: 250000, currency: "NGN" });
});

test("failed account resolution is clear and usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installApiMocks(page, { resolveFails: true });
  await page.goto("/organization/finance");
  await page.getByRole("button", { name: "Add bank account" }).click();
  await page.getByLabel("Bank").selectOption("058");
  await page.getByLabel("Account number").fill("0123456789");
  await page.getByRole("button", { name: "Verify account" }).click();
  await expect(page.getByText("Unable to verify this account. Check the bank and account number.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Verify account" })).toBeEnabled();

  const modal = await page.getByRole("dialog", { name: "Payout bank account" }).boundingBox();
  expect(modal.x).toBeGreaterThanOrEqual(0);
  expect(modal.width).toBeLessThanOrEqual(390);
});
