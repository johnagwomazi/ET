import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

const customer = {
  _id: "64b64b64b64b64b64b64b920",
  firstName: "Ada",
  lastName: "Customer",
  email: "ada@example.com",
  phone: "+2348012345678",
  role: "CUSTOMER",
  accountStatus: "ACTIVE",
  isEmailVerified: true,
};

const organizer = {
  ...customer,
  _id: "64b64b64b64b64b64b64b921",
  lastName: "Organizer",
  role: "ADMIN",
  organization: {
    _id: "64b64b64b64b64b64b64b922",
    organizationName: "Ada Events",
    status: "APPROVED",
  },
};

function apiResponse(data) {
  return { success: true, message: "Operation successful", data };
}

async function mockGoogle(page) {
  await page.addInitScript(() => {
    window.google = {
      accounts: {
        id: {
          initialize(options) {
            window.__googleCredentialCallback = options.callback;
          },
          renderButton(element) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "Continue with Google";
            button.addEventListener("click", () => {
              window.__googleCredentialCallback({ credential: "google-id-token" });
            });
            element.replaceChildren(button);
          },
        },
      },
    };
  });
}

async function installGuestMocks(page, handlers = {}) {
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api", "");
    const handler = handlers[`${request.method()} ${path}`];
    if (handler) return handler(route, request);
    if (path === "/auth/me" || path === "/auth/refresh") {
      return route.fulfill({ status: 401, json: { success: false, message: "Not authorized" } });
    }
    return route.fulfill({ json: apiResponse({}) });
  });
}

test("customer email signup requires phone, supports password visibility, verifies OTP, and resends", async ({ page }) => {
  let verificationPayload;
  let resendCount = 0;
  await installGuestMocks(page, {
    "POST /auth/register/customer": async (route) => {
      await route.fulfill({
        status: 201,
        json: apiResponse({
          user: { ...customer, isEmailVerified: false, accountStatus: "PENDING_VERIFICATION" },
          requiresEmailVerification: true,
          verificationEmailSent: true,
          verificationTicket: "verification-ticket",
        }),
      });
    },
    "POST /auth/verify-email": async (route, request) => {
      verificationPayload = request.postDataJSON();
      return route.fulfill({ json: apiResponse({ user: customer }) });
    },
    "POST /auth/verify-email/resend": (route) => {
      resendCount += 1;
      return route.fulfill({ json: apiResponse({ retryAfterSeconds: 60 }) });
    },
  });

  await page.goto("/register/customer");
  await expect(page.getByRole("link", { name: /home/i })).toHaveCount(0);
  await page.getByLabel("First Name").fill("Ada");
  await page.getByLabel("Last Name").fill("Customer");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("abcdefgh");
  await page.getByLabel("Confirm Password").fill("abcdefgh");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Phone number is required")).toBeVisible();

  const password = page.getByLabel("Password", { exact: true });
  await page.getByRole("button", { name: "Show" }).first().click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide" }).first().click();
  await expect(password).toHaveAttribute("type", "password");

  await page.getByLabel("Phone Number").fill("+2348012345678");
  await expect(page.getByLabel("Phone Number")).toHaveValue("+2348012345678");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/verify-email\?email=/);
  await page.getByLabel("Verification Code").fill("123456");
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page.getByText(/email is verified/i)).toBeVisible();
  expect(verificationPayload).toEqual({ email: "ada@example.com", code: "123456" });

  await page.evaluate(() => sessionStorage.removeItem("events_email_verification"));
  await page.goto("/verify-email?email=ada%40example.com");
  await page.getByRole("button", { name: "Resend code" }).click();
  await expect.poll(() => resendCount).toBe(1);
});

test("organizer email signup preserves organization fields and requires business phone", async ({ page }) => {
  let signupPayload;
  await installGuestMocks(page, {
    "POST /auth/register/organizer": async (route, request) => {
      signupPayload = request.postDataJSON();
      return route.fulfill({
        status: 201,
        json: apiResponse({
          user: { ...organizer, isEmailVerified: false },
          requiresEmailVerification: true,
          verificationEmailSent: true,
          verificationTicket: "organizer-verification-ticket",
        }),
      });
    },
  });
  await page.goto("/register/organizer");
  await page.getByLabel("Organization Name").fill("Ada Events");
  await page.getByLabel("Admin First Name").fill("Ada");
  await page.getByLabel("Admin Last Name").fill("Organizer");
  await page.getByLabel("Business Email").fill("organizer@example.com");
  await page.getByLabel("Password", { exact: true }).fill("abcdefgh");
  await page.getByLabel("Confirm Password").fill("abcdefgh");
  await page.getByRole("button", { name: "Register organization" }).click();
  await expect(page.getByText("Business phone is required")).toBeVisible();
  await page.getByLabel("Business Phone").fill("+2348098765432");
  await page.getByRole("button", { name: "Register organization" }).click();
  await expect(page).toHaveURL(/\/verify-email\?email=/);
  expect(signupPayload.organizationName).toBe("Ada Events");
  expect(signupPayload.businessPhone).toBe("+2348098765432");
});

for (const account of [
  { type: "CUSTOMER", path: "/register/customer", user: customer, expected: /127\.0\.0\.1:4174\/$/ },
  { type: "ADMIN", path: "/register/organizer", user: organizer, expected: /\/organization\/dashboard$/ },
]) {
  test(`Google ${account.type.toLowerCase()} signup completes required details and starts a session`, async ({ page }) => {
    await mockGoogle(page);
    let authenticated = false;
    let completionPayload;
    await installGuestMocks(page, {
      "POST /auth/google": (route) => route.fulfill({
        json: apiResponse({
          user: null,
          requiresProfileCompletion: true,
          requiresAccountType: false,
          completionToken: `completion-${account.type}`,
          profile: { email: account.user.email, firstName: account.user.firstName, lastName: account.user.lastName },
        }),
      }),
      "POST /auth/google/complete": async (route, request) => {
        completionPayload = request.postDataJSON();
        authenticated = true;
        return route.fulfill({ status: 201, json: apiResponse({ user: account.user }) });
      },
      "GET /auth/me": (route) => authenticated
        ? route.fulfill({ json: apiResponse({ user: account.user, organizationPermissions: account.type === "ADMIN" ? ["DASHBOARD_VIEW"] : [] }) })
        : route.fulfill({ status: 401, json: { success: false, message: "Not authorized" } }),
      "GET /organizations/me/dashboard": (route) => route.fulfill({
        json: apiResponse({ organization: organizer.organization, stats: {}, recentActivity: [], quickActions: [] }),
      }),
    });

    await page.goto(account.path);
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect(page).toHaveURL(new RegExp(`/auth/google/complete\\?accountType=${account.type}`));
    await expect(page.getByRole("heading", { name: new RegExp(`Complete your ${account.type === "ADMIN" ? "organizer" : "customer"} account`, "i") })).toBeVisible();
    await page.waitForTimeout(250);
    if (account.type === "ADMIN") await page.getByLabel("Organization Name").fill("Ada Events");
    const phoneInput = page.getByLabel(account.type === "ADMIN" ? "Business Phone" : "Phone Number");
    await phoneInput.fill("+2348012345678");
    await expect(phoneInput).toHaveValue("+2348012345678");
    await page.getByRole("button", { name: "Complete registration" }).click();
    await expect(page).toHaveURL(account.expected);
    expect(completionPayload.accountType).toBe(account.type);
    expect(completionPayload.phone).toBe("+2348012345678");
  });
}

test("existing Google account signs in without creating a duplicate", async ({ page }) => {
  await mockGoogle(page);
  let authenticated = false;
  let googleCalls = 0;
  await installGuestMocks(page, {
    "POST /auth/google": (route) => {
      googleCalls += 1;
      authenticated = true;
      return route.fulfill({ json: apiResponse({ user: customer }) });
    },
    "GET /auth/me": (route) => authenticated
      ? route.fulfill({ json: apiResponse({ user: customer, organizationPermissions: [] }) })
      : route.fulfill({ status: 401, json: { success: false, message: "Not authorized" } }),
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:4174\/$/);
  expect(googleCalls).toBe(1);
});

test("existing organizer password login keeps the role-based dashboard redirect", async ({ page }) => {
  let authenticated = false;
  await installGuestMocks(page, {
    "POST /auth/login": (route) => {
      authenticated = true;
      return route.fulfill({ json: apiResponse({ user: organizer }) });
    },
    "GET /auth/me": (route) => authenticated
      ? route.fulfill({ json: apiResponse({ user: organizer, organizationPermissions: ["DASHBOARD_VIEW"] }) })
      : route.fulfill({ status: 401, json: { success: false, message: "Not authorized" } }),
    "GET /organizations/me/dashboard": (route) => route.fulfill({
      json: apiResponse({ organization: organizer.organization, stats: {}, recentActivity: [], quickActions: [] }),
    }),
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("abcdefgh");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/organization\/dashboard$/);
});

test("forgot and reset password retain their complete form flow", async ({ page }) => {
  let resetPayload;
  await installGuestMocks(page, {
    "POST /auth/forgot-password": (route) => route.fulfill({ json: apiResponse({}) }),
    "POST /auth/reset-password": async (route, request) => {
      resetPayload = request.postDataJSON();
      return route.fulfill({ json: apiResponse({ user: customer }) });
    },
  });
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your inbox.")).toBeVisible();

  await page.goto("/reset-password?token=reset-token");
  await page.getByLabel("New Password").fill("abcdefgh");
  await page.getByLabel("Confirm Password").fill("abcdefgh");
  await page.getByRole("button", { name: "Show" }).first().click();
  await expect(page.getByLabel("New Password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(resetPayload).toEqual({ token: "reset-token", password: "abcdefgh", confirmPassword: "abcdefgh" });
});
