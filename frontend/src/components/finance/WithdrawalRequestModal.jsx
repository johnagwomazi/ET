import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { formatMoney } from "../../utils/formatters";

function WithdrawalRequestModal({ open, summary = {}, isSubmitting, submissionError, onClose, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [fieldError, setFieldError] = useState("");
  const availableBalance = Number(summary.availableBalance || 0);
  const numericAmount = Number(amount);
  const remainingBalance = useMemo(() => {
    if (!summary.payoutDestination?.configured) return "Add a verified bank account before requesting a withdrawal";
    if (!amount || !Number.isFinite(numericAmount)) return availableBalance;
    return Math.max(0, availableBalance - numericAmount);
  }, [amount, availableBalance, numericAmount]);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setFieldError("");
    }
  }, [open]);

  function validate() {
    if (!amount || !Number.isFinite(numericAmount)) return "Enter a valid withdrawal amount";
    if (numericAmount <= 0) return "Amount must be greater than zero";
    if (Math.abs(Math.round(numericAmount * 100) - numericAmount * 100) >= Number.EPSILON * 100) {
      return "Use no more than two decimal places";
    }
    if (numericAmount > availableBalance) return "Amount exceeds the available balance";
    return "";
  }

  function handleSubmit(event) {
    event.preventDefault();
    const error = validate();
    setFieldError(error);
    if (error) return;
    onSubmit({ amount: numericAmount, currency: summary.currency || "NGN" });
  }

  return (
    <Modal open={open} title="Request withdrawal" onClose={isSubmitting ? undefined : onClose} className="max-w-md">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Available Balance</p>
          <p className="mt-2 [overflow-wrap:anywhere] text-xl font-semibold text-white sm:text-2xl">{formatMoney(availableBalance, summary.currency)}</p>
        </div>
        <div className="border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Withdraw to</p>
          {summary.payoutDestination?.configured ? (
            <div className="mt-2 space-y-1 break-words text-sm">
              <p className="font-semibold text-white">{summary.payoutDestination.bankName}</p>
              <p className="text-slate-300">{summary.payoutDestination.accountName}</p>
              <p className="text-slate-400">{summary.payoutDestination.accountNumberMasked}</p>
            </div>
          ) : <p role="alert" className="mt-2 text-sm text-amber-200">Add a verified bank account in Finance before requesting a withdrawal.</p>}
        </div>
        <Input
          autoFocus
          label="Withdrawal amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setFieldError("");
          }}
          placeholder="0.00"
          error={fieldError}
        />
        {amount && !fieldError ? (
          <p className="text-sm text-slate-400">
            Balance after request: <span className="[overflow-wrap:anywhere] font-semibold text-slate-200">{formatMoney(remainingBalance, summary.currency)}</span>
          </p>
        ) : null}
        {submissionError ? <p role="alert" className="border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">{submissionError}</p> : null}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={!summary.payoutDestination?.configured} isLoading={isSubmitting} loadingText="Requesting...">
            <ArrowUpRight className="h-4 w-4" />
            Submit request
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default WithdrawalRequestModal;
