const CHECKOUT_STORAGE_KEY = "events_checkout_selection";
const PAYMENT_REFERENCE_STORAGE_KEY = "events_last_payment_reference";

export function saveCheckoutSelection(selection) {
  window.sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(selection));
}

export function loadCheckoutSelection() {
  try {
    const selection = JSON.parse(window.sessionStorage.getItem(CHECKOUT_STORAGE_KEY) || "null");
    if (!selection?.eventId || !Array.isArray(selection.items) || selection.items.length === 0) return null;
    return selection;
  } catch (error) {
    return null;
  }
}

export function clearCheckoutSelection() {
  window.sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
}

export function savePaymentReference(reference) {
  if (reference) window.sessionStorage.setItem(PAYMENT_REFERENCE_STORAGE_KEY, reference);
}

export function loadPaymentReference() {
  return window.sessionStorage.getItem(PAYMENT_REFERENCE_STORAGE_KEY) || "";
}

export function clearPaymentReference() {
  window.sessionStorage.removeItem(PAYMENT_REFERENCE_STORAGE_KEY);
}
