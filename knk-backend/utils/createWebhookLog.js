const ApiLog = require("../models/ApiLog");

const createWebhookLog = async ({
  appId,
  vendor,
  status,
  callbackUrl,
  response,
}) => {
  try {

    await ApiLog.create({
      appId,
      endpoint: callbackUrl,
      method: "POST",
      status,
      source: "WEBHOOK",

      requestBody: {
        vendor,
      },

      responseBody: response,
    });

  } catch (error) {

    console.error(
      "Webhook Log Error:",
      error.message
    );

  }
};

module.exports = createWebhookLog;