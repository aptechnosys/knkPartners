const Case = require("../models/Case");

const getCaseStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const caseData = await Case.findOne({
      comp_ref_no: applicationId,
      vendor: req.vendor,
    }).select(
      "comp_ref_no candidate_name check_status remark verification_remark updatedAt vendor"
    );

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    res.status(200).json({
      success: true,
      applicationId: caseData.comp_ref_no,
      candidateName: caseData.candidate_name,
      vendor: caseData.vendor,
      status: caseData.check_status,
      remark:
        caseData.verification_remark ||
        caseData.remark ||
        "",
      updatedAt: caseData.updatedAt,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get Bulk Case status 
const getBulkCaseStatus = async (req, res) => {
  try {
    const { applicationIds } = req.body;

    if (
      !applicationIds ||
      !Array.isArray(applicationIds) ||
      applicationIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "applicationIds array is required",
      });
    }

   const cases = await Case.find({
      comp_ref_no: {
        $in: applicationIds,
      },
      vendor: req.vendor,
    }).select(
      "comp_ref_no candidate_name check_status vendor updatedAt"
    );
    const result = cases.map((item) => ({
      applicationId: item.comp_ref_no,
      candidateName: item.candidate_name,
      vendor: item.vendor,
      status: item.check_status,
      updatedAt: item.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: result.length,
      cases: result,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// STATUS BY VENDOR (SECURE)
const getVendorCasesStatus = async (req, res) => {
  try {
    // Vendor comes from API key middleware
    const vendor = req.vendor;

    const cases = await Case.find({
      vendor,
    }).select(
      "comp_ref_no candidate_name check_status updatedAt"
    );

    if (!cases.length) {
      return res.status(404).json({
        success: false,
        message: "No cases found for this vendor",
      });
    }

    const result = cases.map((item) => ({
      applicationId: item.comp_ref_no,
      candidateName: item.candidate_name,
      status: item.check_status,
      updatedAt: item.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      vendor,
      count: result.length,
      cases: result,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getCaseStatus,
  getBulkCaseStatus,
  getVendorCasesStatus,
};