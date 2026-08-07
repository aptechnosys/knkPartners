const mongoose = require("mongoose");

const apiRequestSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      required: true,
      unique: true,
    },

    candidateName: String,
    fatherName: String,
    dob: String,
    city: String,
    state: String,
    vendor: String,
    remark: String,
    tat: {
        type: Number,
        default: 5,
      },
    attachment: String,

    extStatus: {
      type: String,
      default: "PENDING",
    },

    source: {
      type: String,
      default: "Client API",
    },

    processed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ApiRequest", apiRequestSchema);