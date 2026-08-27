const mongoose = require("mongoose");

const apiLogSchema =
  new mongoose.Schema(
    {
      appId: {
        type: String,
        default: "",
      },

      endpoint: {
        type: String,
        default: "",
      },

      method: {
        type: String,
        default: "POST",
      },

      status: {
        type: String,
        default: "SUCCESS",
      },

      source: {
        type: String,
        default: "Client API",
      },

      requestBody: {
        type: Object,
        default: {},
      },

      responseBody: {
        type: Object,
        default: {},
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "ApiLog",
    apiLogSchema
  );