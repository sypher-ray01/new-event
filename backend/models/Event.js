const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    sold: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const vendorSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    contact: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    venue: {
      name: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true }
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    tickets: {
      type: [ticketSchema],
      default: []
    },
    vendors: {
      type: [vendorSchema],
      default: []
    },
    groupBooking: {
      enabled: { type: Boolean, default: false },
      minSize: { type: Number, default: 5, min: 1 },
      discount: { type: Number, default: 10, min: 0, max: 100 }
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["draft", "published", "cancelled"],
      default: "published"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Event", eventSchema);
