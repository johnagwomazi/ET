import PaystackPop from "@paystack/inline-js";

export const PAYSTACK_CHECKOUT_RESULT = Object.freeze({
  SUCCESS: "success",
  CANCELLED: "cancelled",
});

export function openPaystackCheckout(accessCode) {
  if (!accessCode) {
    const error = new Error("Paystack did not provide a checkout access code.");
    error.code = "PAYSTACK_ACCESS_CODE_MISSING";
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    try {
      const popup = new PaystackPop();

      popup.resumeTransaction(accessCode, {
        onSuccess: (response) => resolve({
          status: PAYSTACK_CHECKOUT_RESULT.SUCCESS,
          response,
        }),
        onCancel: () => resolve({
          status: PAYSTACK_CHECKOUT_RESULT.CANCELLED,
        }),
        onError: (providerError) => {
          const error = new Error(
            providerError?.message || "Paystack checkout could not be opened.",
          );
          error.code = "PAYSTACK_INLINE_ERROR";
          reject(error);
        },
      });
    } catch (providerError) {
      const error = new Error(
        providerError?.message || "Paystack checkout could not be opened.",
      );
      error.code = providerError?.code || "PAYSTACK_INLINE_ERROR";
      reject(error);
    }
  });
}
