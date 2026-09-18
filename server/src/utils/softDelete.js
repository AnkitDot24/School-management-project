import mongoose from "mongoose";

export const softDeleteFields = {
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  deleteReason: { type: String, default: null }
};

export function notDeleted(filter = {}) {
  return { ...filter, isDeleted: { $ne: true } };
}
