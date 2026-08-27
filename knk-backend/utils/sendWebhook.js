const axios = require("axios");
const Client = require("../models/Client");
const createWebhookLog = require("./createWebhookLog");

const sendWebhook = async (caseData) => {
  try {
    if (!caseData.vendor) {
      return;
    }

    const client = await Client.findOne({
      vendorName: caseData.vendor,
      isActive: true,
    });

    if (!client || !client.callbackUrl) {
      return;
    }

    const payload = {
      applicationId: caseData.comp_ref_no,
      candidateName: caseData.candidate_name,
      vendor: caseData.vendor,
      status: caseData.check_status,
      remark:
        caseData.verification_remark ||
        caseData.remark ||
        "",
      updatedAt: caseData.updatedAt,
    };

    const response = await axios.post(
      client.callbackUrl,
      payload
    );

    // SUCCESS LOG
    await createWebhookLog({
      appId: caseData.comp_ref_no,
      vendor: caseData.vendor,
      status: "WEBHOOK_SENT",
      callbackUrl: client.callbackUrl,
      response: {
        statusCode: response.status,
        success: true,
      },
    });

    console.log(
      `Webhook sent successfully -> ${caseData.comp_ref_no}`
    );

  } catch (error) {

    // FAILED LOG
    await createWebhookLog({
      appId: caseData.comp_ref_no,
      vendor: caseData.vendor,
      status: "WEBHOOK_FAILED",
      callbackUrl: "",
      response: {
        error: error.message,
      },
    });

    console.error(
      "Webhook Error:",
      error.message
    );
  }
};

module.exports = sendWebhook;