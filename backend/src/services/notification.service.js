export async function sendTicketIssuedNotification(order, tickets) {
  return {
    queued: false,
    type: "ticket-issued",
    orderReference: order?.reference || "",
    ticketCount: tickets?.length || 0,
  };
}

export async function sendPaymentSuccessNotification(order) {
  return {
    queued: false,
    type: "payment-success",
    orderReference: order?.reference || "",
  };
}

export async function sendRefundStatusNotification(refund) {
  return {
    queued: false,
    type: "refund-status",
    refundReference: refund?.reference || "",
  };
}
