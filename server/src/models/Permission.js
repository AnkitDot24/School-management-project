import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    module: { type: String, required: true },
    description: { type: String, default: "" }
  },
  { timestamps: true }
);

export const Permission = mongoose.model("Permission", permissionSchema);
