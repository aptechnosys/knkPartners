const axios = require("axios");
const Client = require("../models/Client");
const createWebhookLog = require("./createWebhookLog");

const sendProofWebhook = async (caseData) => {
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
      
    // Secure proof download URL
    const proofDocument = caseData.proof_document
      ? `${process.env.API_BASE_URL}/api/v1/client/proof/${caseData.comp_ref_no}`
      : "";



    const payload = {
      event: "PROOF_UPDATED",

      applicationId: caseData.comp_ref_no,

      candidateName: caseData.candidate_name,

      vendor: caseData.vendor,

      proofDocument,

      verificationResult:
        caseData.verification_result || "",

      verificationDate:
        caseData.verified_date || null,

      status: caseData.check_status,

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
      status: "PROOF_WEBHOOK_SENT",
      callbackUrl: client.callbackUrl,
      response: {
        statusCode: response.status,
        success: true,
      },
    });

  } catch (error) {

    // FAILED LOG
    await createWebhookLog({
      appId: caseData.comp_ref_no,
      vendor: caseData.vendor,
      status: "PROOF_WEBHOOK_FAILED",
      callbackUrl: "",
      response: {
        error: error.message,
      },
    });

    console.error(
      "Proof Webhook Error:",
      error.message
    );
  }
};

module.exports = sendProofWebhook;