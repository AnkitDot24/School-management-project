import mongoose from "mongoose";

const libraryItemSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    title: { type: String, required: true },
    author: { type: String, default: "" },
    isbn: { type: String, default: "" },
    copies: { type: Number, default: 1 }
  },
  { timestamps: true }
);

export const LibraryItem = mongoose.model("LibraryItem", libraryItemSchema);

const circulationSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    libraryItemId: { type: mongoose.Schema.Types.ObjectId, ref: "LibraryItem", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    issuedAt: { type: Date, required: true },
    dueAt: { type: Date, required: true },
    returnedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Circulation = mongoose.model("Circulation", circulationSchema);

const hostelBlockSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    name: { type: String, required: true }
  },
  { timestamps: true }
);

export const HostelBlock = mongoose.model("HostelBlock", hostelBlockSchema);

const hostelRoomSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    blockId: { type: mongoose.Schema.Types.ObjectId, ref: "HostelBlock", required: true },
    name: { type: String, required: true },
    capacity: { type: Number, default: 2 }
  },
  { timestamps: true }
);

export const HostelRoom = mongoose.model("HostelRoom", hostelRoomSchema);

const hostelAllocSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "HostelRoom", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    fromDate: { type: Date, default: Date.now },
    toDate: { type: Date, default: null }
  },
  { timestamps: true }
);

export const HostelAllocation = mongoose.model("HostelAllocation", hostelAllocSchema);

const vehicleSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    number: { type: String, required: true },
    capacity: { type: Number, default: 20 }
  },
  { timestamps: true }
);

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);

const driverSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    licenseNo: { type: String, default: "" }
  },
  { timestamps: true }
);

export const Driver = mongoose.model("Driver", driverSchema);

const routeSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    name: { type: String, required: true },
    stops: [{ type: String }]
  },
  { timestamps: true }
);

export const TransportRoute = mongoose.model("TransportRoute", routeSchema);

const transportAssignSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "TransportRoute", required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    stop: { type: String, default: "" }
  },
  { timestamps: true }
);

export const TransportAssignment = mongoose.model("TransportAssignment", transportAssignSchema);
