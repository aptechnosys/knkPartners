const Case = require("../models/Case");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

// ============================================
// GET SINGLE CASE STATUS
// ============================================

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
    console.error("Get Case Status Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// GET BULK CASE STATUS
// ============================================

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
    console.error("Get Bulk Case Status Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// GET ALL CASES BY VENDOR
// ============================================

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
    console.error("Get Vendor Cases Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// DOWNLOAD PROOF DOCUMENT(S)
// ============================================

const downloadProofDocument = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    // ============================================
    // 1. FIND CASE FOR AUTHENTICATED VENDOR
    // ============================================

    const caseItem = await Case.findOne({
      comp_ref_no: applicationId,
      vendor: req.vendor,
    });

    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // ============================================
    // 2. CHECK NEW MULTIPLE PROOFS
    // ============================================

    const multipleProofs =
      Array.isArray(caseItem.proofs) &&
      caseItem.proofs.length > 0;

    // ============================================
    // 3. MULTIPLE PROOFS
    // ============================================

    if (multipleProofs) {
      const validProofs = [];

      for (const proof of caseItem.proofs) {
        if (!proof.filePath) {
          continue;
        }

        const filePath = path.resolve(
          __dirname,
          "..",
          proof.filePath.replace(/^\/+/, "")
        );

        // Security check:
        // Make sure resolved file stays inside uploads directory
        const uploadsDirectory = path.resolve(
          __dirname,
          "..",
          "uploads"
        );

        if (
          !filePath.startsWith(
            uploadsDirectory + path.sep
          )
        ) {
          console.error(
            `Blocked invalid proof path: ${filePath}`
          );

          continue;
        }

        if (!fs.existsSync(filePath)) {
          console.error(
            `Proof file not found: ${filePath}`
          );

          continue;
        }

        validProofs.push({
          filePath,
          originalName:
            proof.originalName ||
            path.basename(filePath),
          documentType:
            proof.documentType || "",
        });
      }

      // No valid proofs found
      if (validProofs.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Proof files not found on server",
        });
      }

      // ============================================
      // IF ONLY ONE PROOF EXISTS
      // ============================================

      if (validProofs.length === 1) {
        const proof = validProofs[0];

        return res.download(
          proof.filePath,
          proof.originalName,
          (error) => {
            if (error) {
              console.error(
                "Proof download error:",
                error
              );

              if (!res.headersSent) {
                return res.status(500).json({
                  success: false,
                  message:
                    "Failed to download proof",
                });
              }
            }
          }
        );
      }

      // ============================================
      // MULTIPLE PROOFS → ZIP
      // ============================================

      const zipFileName =
        `${applicationId}-proofs.zip`;

      res.status(200);

      res.setHeader(
        "Content-Type",
        "application/zip"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${zipFileName}"`
      );

      const archive = archiver("zip", {
        zlib: {
          level: 9,
        },
      });

      archive.on("error", (error) => {
        console.error(
          "ZIP creation error:",
          error
        );

        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: "Failed to create proof ZIP",
          });
        }

        res.end();
      });

      archive.pipe(res);

      // ============================================
      // ADD PROOFS TO ZIP
      // ============================================

      const usedNames = new Set();

      for (const proof of validProofs) {
        let downloadName =
          proof.originalName ||
          path.basename(proof.filePath);

        // Prevent duplicate filenames inside ZIP
        if (usedNames.has(downloadName)) {
          const extension =
            path.extname(downloadName);

          const baseName =
            path.basename(
              downloadName,
              extension
            );

          let counter = 2;

          let newName =
            `${baseName}-${counter}${extension}`;

          while (usedNames.has(newName)) {
            counter++;

            newName =
              `${baseName}-${counter}${extension}`;
          }

          downloadName = newName;
        }

        usedNames.add(downloadName);

        archive.file(
          proof.filePath,
          {
            name: downloadName,
          }
        );
      }

      // Finish ZIP
      await archive.finalize();

      return;
    }

    // ============================================
    // 4. OLD SINGLE PROOF
    // ============================================

    if (!caseItem.proof_document) {
      return res.status(404).json({
        success: false,
        message: "Proof document not found",
      });
    }

    // ============================================
    // 5. CONVERT STORED PATH TO ABSOLUTE PATH
    // ============================================

    const filePath = path.resolve(
      __dirname,
      "..",
      caseItem.proof_document.replace(/^\/+/, "")
    );

    // ============================================
    // 6. SECURITY CHECK
    // ============================================

    const uploadsDirectory = path.resolve(
      __dirname,
      "..",
      "uploads"
    );

    if (
      !filePath.startsWith(
        uploadsDirectory + path.sep
      )
    ) {
      console.error(
        `Blocked invalid proof path: ${filePath}`
      );

      return res.status(403).json({
        success: false,
        message: "Invalid proof file path",
      });
    }

    // ============================================
    // 7. CHECK FILE EXISTS
    // ============================================

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Proof file not found on server",
      });
    }

    // ============================================
    // 8. DOWNLOAD OLD SINGLE PROOF
    // ============================================

    return res.download(
      filePath,
      path.basename(filePath),
      (error) => {
        if (error) {
          console.error(
            "Proof download error:",
            error
          );

          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              message:
                "Failed to download proof",
            });
          }
        }
      }
    );
  } catch (error) {
    console.error(
      "Download Proof Document Error:",
      error
    );

    next(error);
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  getCaseStatus,
  getBulkCaseStatus,
  getVendorCasesStatus,
  downloadProofDocument,
};