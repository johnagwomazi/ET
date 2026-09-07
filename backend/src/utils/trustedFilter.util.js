import mongoose from "mongoose";

export function trustedOperator(operatorFilter) {
  return mongoose.trusted(operatorFilter);
}
