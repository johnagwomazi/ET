import { useEffect, useRef, useState } from "react";
import { Landmark } from "lucide-react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import * as financeService from "../../services/finance.service";

function PayoutDetailsModal({ open, isSubmitting, submissionError, onClose, onSubmit, onChange }) {
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [banks, setBanks] = useState([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [bankError, setBankError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [resolution, setResolution] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState("");
  const [errors, setErrors] = useState({});
  const resolutionController = useRef(null);

  useEffect(() => {
    if (!open) {
      setAccountNumber("");
      setBankCode("");
      setResolution(null);
      setResolutionError("");
      setErrors({});
      setIsResolving(false);
      return undefined;
    }

    const controller = new AbortController();
    async function loadBanks() {
      setIsLoadingBanks(true);
      setBankError("");
      setBanks([]);
      try {
        const response = await financeService.getOrganizationPayoutBanks({ signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!response?.banks?.length) throw new Error("No banks are currently available. Please try again.");
        setBanks(response.banks);
      } catch (error) {
        if (!controller.signal.aborted) setBankError(error.message || "Banks could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setIsLoadingBanks(false);
      }
    }
    loadBanks();
    return () => {
      controller.abort();
      resolutionController.current?.abort();
    };
  }, [open, retryKey]);

  function clearResolution() {
    resolutionController.current?.abort();
    resolutionController.current = null;
    setResolution(null);
    setIsResolving(false);
    setResolutionError("");
    setErrors({});
    onChange?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || isResolving) return;
    const nextErrors = {};
    if (!banks.some((bank) => bank.code === bankCode)) nextErrors.bankCode = "Select your bank";
    if (!/^\d{10}$/.test(accountNumber)) nextErrors.accountNumber = "Enter the 10-digit account number";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    if (resolution) {
      await onSubmit({ accountNumber, bankCode, confirmationToken: resolution.confirmationToken });
      return;
    }

    const controller = new AbortController();
    resolutionController.current?.abort();
    resolutionController.current = controller;
    setIsResolving(true);
    setResolutionError("");
    onChange?.();
    try {
      const response = await financeService.resolveOrganizationPayoutAccount(
        { accountNumber, bankCode },
        { signal: controller.signal }
      );
      if (!controller.signal.aborted) setResolution(response);
    } catch (error) {
      if (!controller.signal.aborted) setResolutionError(error.message || "Account verification failed. Please try again.");
    } finally {
      if (!controller.signal.aborted) setIsResolving(false);
    }
  }

  return (
    <Modal open={open} title="Payout bank account" onClose={isSubmitting ? undefined : onClose} className="max-w-md">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <p className="text-sm leading-6 text-slate-400">
          Select your Nigerian bank and verify the account name before saving.
        </p>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Bank</span>
          <select
            autoFocus
            value={bankCode}
            disabled={isLoadingBanks || Boolean(bankError) || isSubmitting}
            aria-invalid={Boolean(errors.bankCode)}
            aria-describedby={errors.bankCode ? "payout-bank-error" : undefined}
            onChange={(event) => {
              clearResolution();
              setBankCode(event.target.value);
            }}
            className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none transition focus:border-app-500 focus:ring-2 focus:ring-app-500/20 disabled:opacity-60"
          >
            <option value="">{isLoadingBanks ? "Loading banks..." : "Select bank"}</option>
            {banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
          </select>
          {errors.bankCode ? <p id="payout-bank-error" role="alert" className="text-xs text-rose-400">{errors.bankCode}</p> : null}
        </label>
        {bankError ? (
          <div role="alert" className="space-y-3 border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">
            <p>{bankError}</p>
            <Button variant="secondary" size="sm" onClick={() => { clearResolution(); setRetryKey((value) => value + 1); }}>Retry bank list</Button>
          </div>
        ) : null}
        <Input
          label="Account number"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          disabled={isSubmitting}
          value={accountNumber}
          onChange={(event) => {
            clearResolution();
            setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10));
          }}
          placeholder="0123456789"
          error={errors.accountNumber}
        />
        {resolution ? (
          <div aria-live="polite" className="space-y-2 border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Resolved account name</p>
            <p className="break-words font-semibold text-white">{resolution.accountName}</p>
            <p className="text-sm text-slate-400">{resolution.bankName} | {resolution.accountNumberMasked}</p>
            <p className="text-sm text-slate-300">Confirm this is the account you want to receive withdrawals.</p>
          </div>
        ) : null}
        {resolutionError || submissionError ? <p role="alert" className="border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">{resolutionError || submissionError}</p> : null}
        {submissionError && resolution ? <Button variant="ghost" onClick={clearResolution} disabled={isSubmitting}>Verify account again</Button> : null}
        <p className="text-xs leading-5 text-slate-500">Saving changes the account for future requests. Existing requests keep their original destination.</p>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isLoadingBanks || Boolean(bankError) || !banks.length} isLoading={isSubmitting || isResolving} loadingText={isSubmitting ? "Saving..." : "Verifying..."}>
            <Landmark className="h-4 w-4" />
            {resolution ? "Confirm and save account" : "Verify account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default PayoutDetailsModal;
