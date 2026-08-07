const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    vendorName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    apiKey: {
      type: String,
      required: true,
      unique: true,
    },

    callbackUrl: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Client ||
  mongoose.model("Client", clientSchema);