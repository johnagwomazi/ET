import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

function PayoutDetailsModal({ open, isSubmitting, submissionError, onClose, onSubmit }) {
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) {
      setAccountNumber("");
      setBankCode("");
      setErrors({});
    }
  }, [open]);

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!/^\d{10}$/.test(accountNumber)) nextErrors.accountNumber = "Enter the 10-digit account number";
    if (!/^\d{3,10}$/.test(bankCode)) nextErrors.bankCode = "Enter a valid numeric bank code";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit({ accountNumber, bankCode });
  }

  return (
    <Modal open={open} title="Configure payout account" onClose={isSubmitting ? undefined : onClose} className="max-w-md">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <p className="text-sm leading-6 text-slate-400">
          The backend verifies this account with Paystack before it can receive withdrawals.
        </p>
        <Input
          autoFocus
          label="Account number"
          inputMode="numeric"
          maxLength={10}
          value={accountNumber}
          onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="0123456789"
          error={errors.accountNumber}
        />
        <Input
          label="Paystack bank code"
          inputMode="numeric"
          maxLength={10}
          value={bankCode}
          onChange={(event) => setBankCode(event.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="058"
          helperText="Enter the numeric Paystack code for the destination bank."
          error={errors.bankCode}
        />
        {submissionError ? <p role="alert" className="border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">{submissionError}</p> : null}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting} loadingText="Verifying...">
            <Landmark className="h-4 w-4" />
            Verify account
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default PayoutDetailsModal;

