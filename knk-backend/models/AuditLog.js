const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      default: "System",
    },

    action: {
      type: String,
      required: true,
    },

    caseId: {
      type: String,
      default: null,
    },

    details: {
      type: String,
      default: "",
    },

    module: {
      type: String,
      default: "CASE",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "AuditLog",
  auditLogSchema
);