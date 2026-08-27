const mongoose = require("mongoose");

const apiRequestSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      required: true,
      trim: true,
    },

    candidateName: {
      type: String,
      default: "",
      trim: true,
    },

    fatherName: {
      type: String,
      default: "",
      trim: true,
    },

    dob: {
      type: String,
      default: "",
    },

    // Candidate Address
    street_address: {
      type: String,
      default: "",
      trim: true,
    },

    

    city: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
    },

    pincode: {
      type: String,
      default: "",
      trim: true,
    },

    vendor: {
      type: String,
      default: "",
      trim: true,
    },

    remark: {
      type: String,
      default: "",
    },

    tat: {
      type: Number,
      default: 5,
    },

    attachment: {
      type: String,
      default: "",
    },

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

module.exports =
  mongoose.models.ApiRequest ||
  mongoose.model("ApiRequest", apiRequestSchema);