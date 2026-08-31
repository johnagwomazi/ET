import Withdrawal from "../models/withdrawal.model.js";

function applySession(query, options = {}) {
  return options.session ? query.session(options.session) : query;
}

export async function createWithdrawal(withdrawalData, options = {}) {
  const withdrawal = new Withdrawal(withdrawalData);
  return withdrawal.save({ session: options.session });
}

export async function findWithdrawalById(withdrawalId, options = {}) {
  return applySession(
    Withdrawal.findById(withdrawalId).populate("organization").populate("requestedBy").populate("reviewedBy"),
    options
  );
}

export async function findWithdrawals(filter = {}, options = {}) {
  return applySession(
    Withdrawal.find(filter)
      .populate("organization")
      .populate("requestedBy")
      .populate("reviewedBy")
      .sort({ createdAt: -1 })
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

export async function updateWithdrawalById(withdrawalId, updateData, options = {}) {
  return applySession(
    Withdrawal.findByIdAndUpdate(withdrawalId, updateData, { new: true, runValidators: true })
      .populate("organization")
      .populate("requestedBy")
      .populate("reviewedBy"),
    options
  );
}
