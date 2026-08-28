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

    // ============================================
    // CHECK WHETHER PROOF EXISTS
    // Supports both:
    // 1. Existing single proof -> proof_document
    // 2. New multiple proofs -> proofs[]
    // ============================================

    const hasProof =
      Boolean(caseData.proof_document) ||
      (Array.isArray(caseData.proofs) &&
        caseData.proofs.length > 0);

    // ============================================
    // SECURE PROOF DOWNLOAD URL
    //
    // IMPORTANT:
    // Do NOT expose the actual filename/path.
    // Client gets only applicationId.
    // ============================================

    const proofDocument = hasProof
      ? `${process.env.API_BASE_URL}/api/v1/client/proof/${caseData.comp_ref_no}`
      : "";

    // ============================================
    // WEBHOOK PAYLOAD
    // ============================================

    const payload = {
      event: "PROOF_UPDATED",

      applicationId: caseData.comp_ref_no,

      candidateName: caseData.candidate_name,

      vendor: caseData.vendor,

      proofDocument,

      verificationResult:
        caseData.verification_result || "",

      verificationRemark:
         caseData.verification_remark || "",  

      verificationDate:
        caseData.verified_date || null,

      status:
        caseData.check_status || "",

      updatedAt:
        caseData.updatedAt || null,
    };

    // ============================================
    // SEND WEBHOOK
    // ============================================

    const response = await axios.post(
      client.callbackUrl,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    // ============================================
    // SUCCESS LOG
    // ============================================

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

    console.log(
      ` Proof webhook sent successfully -> ${caseData.comp_ref_no}`
    );

  } catch (error) {

    // ============================================
    // FAILED LOG
    // ============================================

    await createWebhookLog({
      appId: caseData.comp_ref_no,

      vendor: caseData.vendor,

      status: "PROOF_WEBHOOK_FAILED",

      callbackUrl: "",

      response: {
        statusCode:
          error.response?.status || null,

        error:
          error.response?.data ||
          error.message,
      },
    });

    console.error(
      "❌ Proof Webhook Error:",
      error.response?.data ||
      error.message
    );
  }
};

module.exports = sendProofWebhook;