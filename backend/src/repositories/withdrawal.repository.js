import mongoose from "mongoose";
import Withdrawal from "../models/withdrawal.model.js";
import { trustedOperator } from "../utils/trustedFilter.util.js";

function applySession(query, options = {}) {
  return options.session ? query.session(options.session) : query;
}

export async function createWithdrawal(withdrawalData, options = {}) {
  const withdrawal = new Withdrawal(withdrawalData);
  return withdrawal.save({ session: options.session });
}

export async function findWithdrawalById(withdrawalId, options = {}) {
  return applySession(
    Withdrawal.findById(withdrawalId)
      .select("+providerRecipientCode")
      .populate("organization")
      .populate("requestedBy")
      .populate("reviewedBy"),
    options
  );
}

export async function findWithdrawalByTransferReference(transferReference, options = {}) {
  return applySession(
    Withdrawal.findOne({ transferReference }).select("+providerRecipientCode"),
    options
  );
}

export async function findWithdrawals(filter = {}, options = {}) {
  return applySession(
    Withdrawal.find(filter)
      .populate("organization")
      .populate("requestedBy")
      .populate("reviewedBy")
      .sort({ [options.sortBy || "createdAt"]: options.sortOrder || -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 20),
    options
  );
}

export async function countWithdrawals(filter = {}, options = {}) {
  return applySession(Withdrawal.countDocuments(filter), options);
}

export async function sumWithdrawals(organizationId, statuses = []) {
  const match = { organization: organizationId };

  if (statuses.length > 0) {
    match.status = { $in: statuses };
  }

  const [summary] = await Withdrawal.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  return summary?.total || 0;
}

export async function getOrganizationWithdrawalTotals(organizationId, options = {}) {
  const aggregation = Withdrawal.aggregate([
    { $match: { organization: new mongoose.Types.ObjectId(organizationId) } },
    {
      $project: {
        status: 1,
        amountMinor: {
          $ifNull: ["$amountMinor", { $round: [{ $multiply: [{ $ifNull: ["$amount", 0] }, 100] }, 0] }],
        },
      },
    },
    { $group: { _id: "$status", amountMinor: { $sum: "$amountMinor" }, count: { $sum: 1 } } },
  ]);
  const rows = await (options.session ? aggregation.session(options.session) : aggregation);

  return Object.fromEntries(rows.map((row) => [row._id, {
    amountMinor: Math.round(Number(row.amountMinor || 0)),
    count: Number(row.count || 0),
  }]));
}

export async function updateWithdrawalById(withdrawalId, updateData, options = {}) {
  return applySession(
    Withdrawal.findByIdAndUpdate(withdrawalId, updateData, { new: true, runValidators: true })
      .populate("organization")
      .populate("requestedBy")
      .populate("reviewedBy"),
    options
  );
}

export async function updateWithdrawalByStatus(withdrawalId, expectedStatuses, updateData, options = {}) {
  return applySession(
    Withdrawal.findOneAndUpdate(
      { _id: withdrawalId, status: trustedOperator({ $in: expectedStatuses }) },
      updateData,
      { new: true, runValidators: true }
    )
      .select("+providerRecipientCode")
      .populate("organization")
      .populate("requestedBy")
      .populate("reviewedBy"),
    options
  );
}
