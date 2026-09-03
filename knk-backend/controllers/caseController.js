const Case = require("../models/Case");
const fs = require("fs");
const path = require("path");
const createAuditLog = require("../utils/auditLogger");
const sendWebhook = require("../utils/sendWebhook");
const sendProofWebhook = require("../utils/sendProofWebhook");
const {
  readExcelFile,
  extractZip,
  validateExcelData,
  validateExcelRow,
  excelDateToJSDate,
} = require("../services/bulkUploadService");


// POST - create case
exports.createCase = async (req, res, next) => {
  try {
      const newCase = await Case.create({
      ...req.body,
      user: req.user._id   // 🔥 logged-in user
    });

    res.status(201).json({
      success: true,
      message: "Case created successfully",
      data: newCase,
    });

  } catch (error) {
    next(error);
  }
};

// GET - all cases with pagination, filtering, search and sorting

exports.getAllCases = async (req, res, next) => {

  

  try {

    // Pagination
    const page =
      parseInt(req.query.page) || 1;

    const limit =
      parseInt(req.query.limit) || 5;

    const skip =
      (page - 1) * limit;

    // Filters
    let filter = {
      $or: [
        { isArchived: false },
        { isArchived: { $exists: false } },
      ],
    };

    // Agent → only assigned cases
    if (
      req.user.role !== "admin"
    ) {
      filter.assignedTo =
        req.user._id;
    }

    // Status filter
    if (req.query.status) {
      filter.check_status =
        req.query.status;
    }

    // Pending filter
    if (req.query.pending) {

      filter.check_status = {
        $nin: [
          "DONE",
          "REJECTED",
          "STOPPED"
        ]
      };

    }

    // Search filter
    if (req.query.search) {

      filter.$or = [

        {
          comp_ref_no: {
            $regex:
              req.query.search,
            $options: "i",
          }
        },

        {
          candidate_name: {
            $regex:
              req.query.search,
            $options: "i",
          }
        }

      ];
    }
    // Overdue filter
if (req.query.overdue === "true") {

  const baseCases =
    await Case.find(filter);

  const overdueIds =
    baseCases
      .filter((c) => {

        if (!c.tat)
          return false;

        const status =
          (c.check_status || "")
            .toUpperCase();

        // ignore closed cases only
        if (
          [
            "DONE",
            "REJECTED",
            "STOPPED"
          ].includes(status)
        ) {
          return false;
        }

        const tatEnd =
          new Date(
            c.createdAt
          ).getTime() +
          (
            parseInt(c.tat) *
            24 *
            60 *
            60 *
            1000
          );

        return (
          Date.now() >
          tatEnd
        );

      })
      .map(c => c._id);

  filter._id = {
    $in: overdueIds
  };
}

    // Sorting
    let sortBy =
      "-createdAt";

    if (req.query.sort) {
      sortBy =
        req.query.sort;
    }

    // Total count
    const total =
      await Case.countDocuments(
        filter
      );

    // Fetch data
    const cases =
      await Case.find(filter)
        .populate(
          "user",
          "email role"
        )
        .populate(
          "assignedTo",
          "email role"
        )
        
        .sort(sortBy)
        .skip(skip)
        .limit(limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages:
        Math.ceil(
          total / limit
        ),
      sort: sortBy,
      data: cases,
    });

  } catch (error) {
    next(error);
  }
};




// PUT - update full case
exports.updateCase = async (req, res, next) => {
  try {

    let filter = { _id: req.params.id };

    // Non-admin users can update only their own cases
    if (req.user.role !== "admin") {
      filter.user = req.user._id;
    }

    const updatedCase = await Case.findOneAndUpdate(
      filter,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      message: "Case updated successfully",
      data: updatedCase,
    });

  } catch (error) {
    next(error);
  }
};


// DELETE - case by ID
exports.deleteCase = async (req, res, next) => {
  try {
      const deletedCase = await Case.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id
  });

    if (!deletedCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      message: "Case deleted successfully",
    });

  } catch (error) {
    next(error);
  }
};

// Assign case
exports.assignCase = async (req, res, next) => {

  
  try {
    
    const { assignedTo } = req.body;

    if (!assignedTo) {
      const error = new Error("assignedTo is required");
      error.statusCode = 400;
      return next(error);
    }

    const updatedCase = await Case.findByIdAndUpdate(
      req.params.id,
      { assignedTo },
      { new: true }
    ).populate("assignedTo", "email role");
     
    // Audit log 
    await createAuditLog({
      userId: req.user.id,
      action: "CASE_ASSIGNED",
      caseId: updatedCase._id,
      details: `Assigned to ${assignedTo}`,
      module: "CASE",
    });

    if (!updatedCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      message: "Case assigned successfully",
      data: updatedCase
    });

  } catch (error) {
    next(error);
  }
};


// DASHBOARD STATS
// DASHBOARD STATS
exports.getDashboardStats = async (req, res, next) => {
  try {
    let filter = {};

    // Agent → only assigned cases
    if (req.user.role !== "admin") {
      filter.assignedTo = req.user._id;
    }

    // Fetch all visible cases
    const allCases = await Case.find(filter);

    // OVERDUE CALCULATION
    const overdueCases = allCases.filter((c) => {
      // Must have TAT
      if (!c.tat) {
        return false;
      }

      const status = (c.check_status || "").toUpperCase();

      // COMPLETED cases are final/closed
      if (status === "COMPLETED") {
        return false;
      }

      const deadline = new Date(c.createdAt);

      deadline.setDate(
        deadline.getDate() + Number(c.tat)
      );

      return deadline < new Date();
    }).length;

    // TOTAL CASES
    const totalCases = await Case.countDocuments(filter);

    // NEW CASES
    const newCases = await Case.countDocuments({
      ...filter,
      check_status: "NEW",
    });

    // PENDING / ACTIVE CASES
    const pendingCases = await Case.countDocuments({
      ...filter,
      check_status: {
        $in: ["NEW", "IN_PROGRESS"],
      },
    });

    // IN PROGRESS / WIP
    const inProgressCases = await Case.countDocuments({
      ...filter,
      check_status: "IN_PROGRESS",
    });

    // COMPLETED
    const completedCases = await Case.countDocuments({
      ...filter,
      check_status: "COMPLETED",
    });

    res.status(200).json({
      success: true,
      data: {
        totalCases,
        pendingCases,
        overdueCases,
        newCases,
        inProgressCases,
        completedCases,
      },
    });

  } catch (error) {
    next(error);
  }
};

//Get Single Case

exports.getSingleCase = async (req, res, next) => {

  try {

    const singleCase =
  await Case.findById(
    req.params.id
  )
    .populate(
      "assignedTo",
      "email role"
    )
    .populate(
      "user",
      "email role"
    )
    .populate(
      "verified_by",
      "email role"
    );

    

    if (!singleCase) {

      const error = new Error("Case not found");

      error.statusCode = 404;

      return next(error);

    }

    res.status(200).json({
      success: true,
      data: singleCase,
    });

  } catch (error) {

    next(error);

  }

};

// UPDATE CASE STATUS
exports.updateCaseStatus = async (
  req,
  res,
  next
) => {
  try {

   

    const { check_status } =
      req.body;

    const updatedCase =
      await Case.findByIdAndUpdate(
        req.params.id,
        { check_status },
        { new: true }
      );

    if (!updatedCase) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    await sendWebhook(updatedCase);

    await createAuditLog({
      userId: req.user.id,
      action: "STATUS_UPDATED",
      caseId: updatedCase._id,
      details:
        `Status changed to ${check_status}`,
      module: "CASE",
    });

    res.status(200).json({
      success: true,
      data: updatedCase,
    });

  } catch (error) {
    next(error);
  }
};


// RAISE INSUFFICIENT QUERY
exports.raiseInsufficientQuery =
async (req, res, next) => {

  try {

    

    const caseData =
      await Case.findById(
        req.params.id
      );

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    caseData.insufficient_query =
      req.body.query;

    caseData.check_status =
      "INSUFFICIENT";

    await caseData.save();

    await sendWebhook(caseData);

    await createAuditLog({
      userId: req.user.id,
      action:
        "INSUFFICIENT_RAISED",
      caseId: caseData._id,
      details:
        `Insufficient query raised: ${req.body.query}`,
      module: "CASE",
    });

    res.status(200).json({
      success: true,
      message:
        "Query raised successfully",
      data: caseData,
    });

  } catch (error) {
    next(error);
  }
};

// SAVE VERIFICATION RESULT
exports.saveVerification = async (req, res, next) => {
  try {
    const {
      verification_result,
      verification_remark,
      proof_document,
    } = req.body;

    const caseData = await Case.findById(req.params.id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Verification result
    caseData.verification_result =
      verification_result || null;

    // Verification remark
    caseData.verification_remark =
      verification_remark || "";

    // Keep existing uploaded proof
    if (proof_document) {
      caseData.proof_document = proof_document;
    }

    // Verified information
    caseData.verified_by = req.user._id;
    caseData.verified_date = new Date();

    // IMPORTANT:
    // Once verification is completed,
    // automatically mark case as COMPLETED
    caseData.check_status = "COMPLETED";

    await caseData.save();

    // Send webhook AFTER case is saved
    // This ensures webhook contains the latest
    // verification + proof information
    await sendProofWebhook(caseData);

    await createAuditLog({
      userId: req.user.id,
      action: "VERIFICATION_SAVED",
      caseId: caseData._id,
      details: `Verification completed: ${verification_result}`,
      module: "CASE",
    });

    res.status(200).json({
      success: true,
      message: "Verification completed successfully",
      data: caseData,
    });

  } catch (error) {
    console.error("SAVE VERIFICATION ERROR:", error);
    next(error);
  }
};

// ============================================================
// UPLOAD PROOF DOCUMENT
// Upload proof -> save proof -> mark case COMPLETED -> webhook
// ============================================================
exports.uploadProofDocument = async (req, res, next) => {
  try {
    // ----------------------------------------------------------
    // Find case
    // ----------------------------------------------------------
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // ----------------------------------------------------------
    // Check uploaded file
    // ----------------------------------------------------------
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // ----------------------------------------------------------
    // Build proof file path
    // ----------------------------------------------------------
    const proofPath = `/uploads/proofs/${req.file.filename}`;

    // ----------------------------------------------------------
    // Keep legacy proof_document for backward compatibility
    // ----------------------------------------------------------
    caseItem.proof_document = proofPath;

    // ----------------------------------------------------------
    // Add proof to proofs[] array
    // ----------------------------------------------------------
    caseItem.proofs.push({
      documentType: req.body.documentType || "PROOF",
      originalName: req.file.originalname || req.file.filename,
      filePath: proofPath,
      mimeType: req.file.mimetype || "",
      uploadedAt: new Date(),
    });

    // ----------------------------------------------------------
    // IMPORTANT:
    // Uploading proof automatically completes the case
    // ----------------------------------------------------------
    caseItem.check_status = "COMPLETED";

    // ----------------------------------------------------------
    // Verification date
    // ----------------------------------------------------------
    caseItem.verified_date = new Date();

    // ----------------------------------------------------------
    // Save everything together
    // ----------------------------------------------------------
    await caseItem.save();

    // ----------------------------------------------------------
    // Trigger webhook AFTER proof + COMPLETED status are saved
    // ----------------------------------------------------------
    await sendProofWebhook(caseItem);

    // ----------------------------------------------------------
    // Response
    // ----------------------------------------------------------
    return res.status(200).json({
      success: true,
      message: "Proof uploaded and case completed successfully",

      caseId: caseItem._id,

      applicationId: caseItem.comp_ref_no,

      status: caseItem.check_status,

      proof_document: caseItem.proof_document,

      proof: {
        documentType:
          req.body.documentType || "PROOF",

        originalName:
          req.file.originalname || req.file.filename,

        filePath:
          proofPath,

        mimeType:
          req.file.mimetype || "",

        uploadedAt:
          caseItem.proofs[
            caseItem.proofs.length - 1
          ].uploadedAt,
      },
    });

  } catch (error) {
    console.error(
      "UPLOAD PROOF ERROR:",
      error
    );

    next(error);
  }
};

// ============================================================
// VIEW / DOWNLOAD PROOF DOCUMENT
// Protected route - logged-in users
// ============================================================

exports.viewProofDocument = async (req, res, next) => {
  try {
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // ----------------------------------------------------------
    // Get proof path
    // Supports:
    // 1. Legacy proof_document
    // 2. New proofs[] array
    // ----------------------------------------------------------

    let proofPath = caseItem.proof_document;

    if (
      !proofPath &&
      Array.isArray(caseItem.proofs) &&
      caseItem.proofs.length > 0
    ) {
      proofPath =
        caseItem.proofs[caseItem.proofs.length - 1].filePath;
    }

    if (!proofPath) {
      return res.status(404).json({
        success: false,
        message: "No proof document found for this case",
      });
    }

    // ----------------------------------------------------------
    // Get only filename
    // ----------------------------------------------------------

    const fileName = path.basename(proofPath);

    // ----------------------------------------------------------
    // IMPORTANT:
    // Use the SAME directory structure as uploadProof.js
    //
    // caseController.js
    //      ↓
    // ../uploads/proofs
    // ----------------------------------------------------------

    const filePath = path.join(
      __dirname,
      "..",
      "uploads",
      "proofs",
      fileName
    );

    console.log("========== VIEW PROOF ==========");
    console.log("Case:", caseItem.comp_ref_no);
    console.log("Proof path from DB:", proofPath);
    console.log("Filename:", fileName);
    console.log("Physical file path:", filePath);
    console.log("File exists:", fs.existsSync(filePath));
    console.log("================================");

    // ----------------------------------------------------------
    // Check physical file
    // ----------------------------------------------------------

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Proof document file not found on server",
      });
    }

    // ----------------------------------------------------------
    // Detect MIME type
    // ----------------------------------------------------------

    const ext = path.extname(fileName).toLowerCase();

    const mimeTypes = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };

    const contentType =
      mimeTypes[ext] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);

    // Open in browser instead of downloading
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${fileName}"`
    );

    return res.sendFile(filePath);

  } catch (error) {
    console.error(
      "VIEW PROOF DOCUMENT ERROR:",
      error
    );

    next(error);
  }
};

  // ARCHIVE CASE
exports.archiveCase = async (req, res) => {
  try {

    const caseData =
      await Case.findById(req.params.id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    caseData.isArchived = true;
    caseData.archivedAt = new Date();
    caseData.archivedBy =
      req.user?.email || "Admin";

    await caseData.save();

    await createAuditLog({
      userId: req.user.id,
      action: "CASE_ARCHIVED",
      caseId: caseData._id,
      details: "Case archived",
      module: "CASE",
    });

    res.status(200).json({
      success: true,
      message: "Case archived successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// ============================================================
// BULK ARCHIVE COMPLETED CASES
// ============================================================

exports.bulkArchiveCases = async (req, res) => {
  try {
    const { caseIds } = req.body;

    // ==========================================================
    // 1. VALIDATE INPUT
    // ==========================================================

    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one case ID.",
      });
    }

    // Remove duplicates
    const uniqueCaseIds = [
      ...new Set(caseIds.map((id) => String(id))),
    ];

    // ==========================================================
    // 2. FIND ONLY ELIGIBLE CASES
    //
    // IMPORTANT:
    // Only COMPLETED cases can be archived.
    // Already archived cases are ignored.
    // ==========================================================

    const eligibleCases = await Case.find({
      _id: {
        $in: uniqueCaseIds,
      },

      check_status: "COMPLETED",

      isArchived: {
        $ne: true,
      },
    }).select(
      "_id comp_ref_no check_status isArchived"
    );

    // ==========================================================
    // 3. NO ELIGIBLE CASES
    // ==========================================================

    if (!eligibleCases.length) {
      return res.status(400).json({
        success: false,
        message:
          "No eligible completed cases found to archive.",
        requested: uniqueCaseIds.length,
        archived: 0,
      });
    }

    // ==========================================================
    // 4. GET IDs OF ELIGIBLE CASES
    // ==========================================================

    const eligibleIds = eligibleCases.map(
      (caseItem) => caseItem._id
    );

    // ==========================================================
    // 5. BULK UPDATE
    //
    // ONE DATABASE OPERATION
    // ==========================================================

    const result = await Case.updateMany(
      {
        _id: {
          $in: eligibleIds,
        },

        check_status: "COMPLETED",

        isArchived: {
          $ne: true,
        },
      },

      {
        $set: {
          isArchived: true,

          archivedAt: new Date(),

          archivedBy:
            req.user?.email || "Admin",
        },
      }
    );

    // ==========================================================
    // 6. CREATE AUDIT LOGS
    //
    // One audit entry per archived case.
    // ==========================================================

    try {
      await Promise.all(
        eligibleCases.map((caseItem) =>
          createAuditLog({
            userId: req.user.id,

            action: "CASE_ARCHIVED",

            caseId: caseItem._id,

            details:
              "Case archived through bulk archive",

            module: "CASE",
          })
        )
      );
    } catch (auditError) {
      // Do not fail the archive operation
      // if audit logging has an issue.

      console.error(
        "Bulk archive audit log error:",
        auditError.message
      );
    }

    // ==========================================================
    // 7. RESPONSE
    // ==========================================================

    const archivedCount =
      result.modifiedCount ?? eligibleCases.length;

    const skippedCount =
      uniqueCaseIds.length - archivedCount;

    return res.status(200).json({
      success: true,

      message:
        `${archivedCount} case(s) archived successfully.`,

      summary: {
        requested: uniqueCaseIds.length,

        archived: archivedCount,

        skipped: skippedCount,
      },

      archivedCases: eligibleCases.map(
        (caseItem) => ({
          id: caseItem._id,

          applicationId:
            caseItem.comp_ref_no,
        })
      ),
    });

  } catch (error) {
    console.error(
      "BULK ARCHIVE CASES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to archive cases.",
    });
  }
};

  exports.getArchivedCases = async (req, res) => {
  try {

    const cases = await Case.find({
      isArchived: true,
    })
      .populate(
        "assignedTo",
        "email"
      )
      .sort({
        archivedAt: -1,
      });

    res.status(200).json({
      success: true,
      data: cases,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// restore archive cases
exports.restoreCase = async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    if (!caseItem.isArchived) {
      return res.status(400).json({
        success: false,
        message: "Case is not archived",
      });
    }

    caseItem.isArchived = false;
    caseItem.archivedAt = null;
    caseItem.archivedBy = null;

    await caseItem.save();

    return res.status(200).json({
      success: true,
      message: "Case restored successfully",
      data: caseItem,
    });

  } catch (error) {
    console.error("RESTORE CASE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// Multiple select delete
exports.bulkDeleteCases = async (
  req,
  res
) => {
  try {

    const { ids } = req.body;

    await Case.deleteMany({
      _id: { $in: ids },
      isArchived: true,
    });

    res.status(200).json({
      success: true,
      message:
        "Cases deleted successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// Bulk status change
exports.bulkUpdateStatus = async (req, res, next) => {
  try {
    const { comp_ref_nos, check_status } = req.body;

    if (!Array.isArray(comp_ref_nos) || comp_ref_nos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one case.",
      });
    }

    if (comp_ref_nos.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 cases allowed.",
      });
    }

    // Find all matching cases
    const cases = await Case.find({
      comp_ref_no: {
        $in: comp_ref_nos,
      },
    });

    if (!cases.length) {
      return res.status(404).json({
        success: false,
        message: "No matching cases found.",
      });
    }

    let updatedCount = 0;

    // Update every case
    for (const caseItem of cases) {
      caseItem.check_status = check_status;

      await caseItem.save();

      updatedCount++;

      // Webhook & Audit Log
      try {
        await sendWebhook(caseItem);

        await createAuditLog({
          userId: req.user.id,
          action: "BULK_STATUS_UPDATED",
          caseId: caseItem._id,
          details: `Status changed to ${check_status}`,
          module: "CASE",
        });
      } catch (err) {
        console.error(
          `Webhook/Audit failed for ${caseItem.comp_ref_no}:`,
          err.message
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: `${updatedCount} cases updated successfully.`,
      modifiedCount: updatedCount,
    });

  } catch (error) {
    next(error);
  }
};

// // ============================================================
// // BULK UPLOAD (EXCEL + ZIP)
// // Maximum 100 Cases
// // ============================================================

// exports.bulkUploadCases = async (req, res, next) => {
//   try {

//     // ============================================================
//     // 1. CHECK FILES
//     // ============================================================

//     if (!req.files?.excel || !req.files?.zip) {
//       return res.status(400).json({
//         success: false,
//         message: "Excel file and ZIP file are required.",
//       });
//     }

//     const excelPath = req.files.excel[0].path;
//     const zipPath = req.files.zip[0].path;

//     // ============================================================
//     // 2. READ EXCEL
//     // ============================================================

//     const excelData = readExcelFile(excelPath);

//     if (!excelData || !Array.isArray(excelData)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Excel file.",
//       });
//     }

//     // ============================================================
//     // 3. MAXIMUM 100 CASES
//     // ============================================================

//     if (excelData.length > 100) {
//       return res.status(400).json({
//         success: false,
//         message: "Maximum 100 cases can be uploaded at once.",
//         totalRows: excelData.length,
//         maxAllowed: 100,
//       });
//     }

//     if (excelData.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Excel file contains no records.",
//       });
//     }

//     // ============================================================
//     // 4. VALIDATE EXCEL
//     // ============================================================

//     validateExcelData(excelData);

//     // ============================================================
//     // 5. EXTRACT ZIP
//     // ============================================================

//     const proofFolder = extractZip(zipPath);

//     if (!fs.existsSync(proofFolder)) {
//       return res.status(400).json({
//         success: false,
//         message: "Failed to extract proof ZIP.",
//       });
//     }

//     // ============================================================
//     // 6. READ PROOF FILES
//     // ============================================================

//     const proofFiles = fs.readdirSync(proofFolder);

//     const matchedCases = [];
//     const errors = [];

//     // ============================================================
//     // 7. MATCH EXCEL WITH ZIP
//     // ============================================================

//     for (const row of excelData) {

//       const referenceNo = String(
//         row["Reference No"] || ""
//       ).trim();

//       const fileName = String(
//         row["File Name"] || ""
//       ).trim();

//       if (!referenceNo) {
//         errors.push(
//           "Reference No is missing in Excel."
//         );
//         continue;
//       }

//       if (!fileName) {
//         errors.push(
//           `File Name is missing for ${referenceNo}.`
//         );
//         continue;
//       }

//       // ----------------------------------------------------------
//       // Match filename without extension
//       // ----------------------------------------------------------

//       const matchedFile = proofFiles.find(
//         (file) =>
//           path.parse(file).name.trim() === fileName
//       );

//       if (!matchedFile) {
//         errors.push(
//           `Proof file not found for ${referenceNo} (Expected: ${fileName})`
//         );
//         continue;
//       }

//       // ==========================================================
//       // 8. FIND CASE
//       // ==========================================================

//       const caseItem = await Case.findOne({
//         comp_ref_no: referenceNo,
//       });

//       if (!caseItem) {
//         errors.push(
//           `Case not found for Reference No ${referenceNo}`
//         );
//         continue;
//       }

//       // ==========================================================
//       // 9. PREVENT DUPLICATE COMPLETED CASE
//       // ==========================================================

//       if (
//         String(caseItem.check_status)
//           .toUpperCase() === "COMPLETED"
//       ) {
//         errors.push(
//           `${referenceNo} is already completed.`
//         );
//         continue;
//       }

//       // ==========================================================
//       // STORE EVERYTHING FROM EXCEL
//       // ==========================================================

//       matchedCases.push({
//         referenceNo,
//         dbCaseId: caseItem._id,
//         proofFile: matchedFile,

//         verifyStatus: String(
//           row["Verify Status"] || ""
//         ).trim(),

//         colourCode: String(
//           row["Colour Code"] || ""
//         ).trim(),

//         verificationDate:
//           row["Verification Date"],

//         verificationRemark:
//           String(
//             row["Verification Remark"] || ""
//           ).trim(),
//       });

//       console.log(
//         `✅ Matched ${referenceNo} -> ${matchedFile}`
//       );
//     }

//     // ============================================================
//     // 10. UPDATE CASES
//     // ============================================================

//     let updatedCount = 0;

//     for (const item of matchedCases) {

//       const caseItem = await Case.findById(
//         item.dbCaseId
//       );

//       if (!caseItem) {
//         errors.push(
//           `Case ${item.referenceNo} no longer exists.`
//         );
//         continue;
//       }

//       // ==========================================================
//       // 11. VERIFY STATUS
//       // ==========================================================

//       const verifyStatus =
//         item.verifyStatus.toLowerCase();

//       if (verifyStatus !== "completed") {
//         errors.push(
//           `${item.referenceNo}: Verify Status must be Completed.`
//         );
//         continue;
//       }

//       // ==========================================================
//       // 12. COPY PROOF INTO PERMANENT PROOF FOLDER
//       // ==========================================================

//       const sourcePath = path.join(
//         proofFolder,
//         item.proofFile
//       );

//       const proofsDirectory = path.resolve(
//         __dirname,
//         "../uploads/proofs"
//       );

//       if (!fs.existsSync(proofsDirectory)) {
//         fs.mkdirSync(proofsDirectory, {
//           recursive: true,
//         });
//       }

//       // ----------------------------------------------------------
//       // Generate unique filename
//       // ----------------------------------------------------------

//       const uniqueFileName =
//         `${Date.now()}-${Math.round(
//           Math.random() * 1e9
//         )}${path.extname(item.proofFile)}`;

//       const destinationPath = path.join(
//         proofsDirectory,
//         uniqueFileName
//       );

//       // ----------------------------------------------------------
//       // Copy ZIP proof to permanent folder
//       // ----------------------------------------------------------

//       fs.copyFileSync(
//         sourcePath,
//         destinationPath
//       );

//       // ==========================================================
//       // 13. SAVE PROOF PATH
//       // ==========================================================

//       caseItem.proof_document =
//         `/uploads/proofs/${uniqueFileName}`;

//       // ==========================================================
//       // 14. VERIFICATION RESULT
//       // ==========================================================

//       const colourMap = {
//         green: "GREEN",
//         red: "RED",
//         orange: "ORANGE",
//         insufficient: "INSUFFICIENT",
//       };

//       caseItem.verification_result =
//         colourMap[
//           item.colourCode.toLowerCase()
//         ] || null;

//       // ==========================================================
//       // 15. VERIFICATION REMARK
//       // ==========================================================

//       caseItem.verification_remark =
//         item.verificationRemark || "";

//       // ==========================================================
//       // 16. VERIFICATION DATE
//       // ==========================================================

//       if (item.verificationDate) {
//         caseItem.verified_date =
//           excelDateToJSDate(
//             item.verificationDate
//           );
//       } else {
//         caseItem.verified_date = new Date();
//       }

//       // ==========================================================
//       // 17. VERIFIED BY
//       // ==========================================================

//       caseItem.verified_by =
//         req.user._id;

//       // ==========================================================
//       // 18. STATUS
//       // ==========================================================

//       // This moves the case from active/in-progress
//       // into the COMPLETED cases table/filter.
//       caseItem.check_status =
//         "COMPLETED";

//       // ==========================================================
//       // 19. OLD RECORD SAFETY
//       // ==========================================================

//       if (!caseItem.user) {
//         caseItem.user = req.user._id;
//       }

//       // ==========================================================
//       // 20. SAVE CASE
//       // ==========================================================

//       await caseItem.save();

//       updatedCount++;

//       console.log(
//         `✅ Case completed -> ${item.referenceNo}`
//       );

//       // ==========================================================
//       // 21. PROOF WEBHOOK
//       // ==========================================================
//       //
//       // IMPORTANT:
//       // sendProofWebhook(caseItem) uses:
//       //
//       // caseItem.vendor
//       // caseItem.comp_ref_no
//       // caseItem.proof_document
//       //
//       // Therefore each completed case sends its own
//       // proof URL to its own vendor.
//       //
//       // No proof is shared between vendors.
//       // ==========================================================

//       try {

//         await sendProofWebhook(caseItem);

//         console.log(
//           `📤 Proof webhook sent -> ${item.referenceNo} -> ${caseItem.vendor}`
//         );

//       } catch (webhookError) {

//         console.error(
//           `❌ Proof webhook failed -> ${item.referenceNo}:`,
//           webhookError.message
//         );
//       }

//       // ==========================================================
//       // 22. AUDIT LOG
//       // ==========================================================

//       try {

//         await createAuditLog({
//           userId: req.user.id,

//           action: "BULK_PROOF_UPLOAD",

//           caseId: caseItem._id,

//           details:
//             `Proof uploaded through bulk upload for ${caseItem.comp_ref_no}`,

//           module: "CASE",
//         });

//       } catch (auditError) {

//         console.error(
//           "Audit log failed:",
//           auditError.message
//         );
//       }
//     }

//     // ============================================================
//     // 23. CLEANUP EXCEL + ZIP
//     // ============================================================

//     try {

//       if (fs.existsSync(excelPath)) {
//         fs.unlinkSync(excelPath);
//       }

//       if (fs.existsSync(zipPath)) {
//         fs.unlinkSync(zipPath);
//       }

//     } catch (cleanupError) {

//       console.error(
//         "Excel/ZIP cleanup failed:",
//         cleanupError.message
//       );
//     }

//     // ============================================================
//     // 24. CLEANUP EXTRACTED FILES
//     // ============================================================

//     try {

//       const extractedFiles =
//         fs.readdirSync(proofFolder);

//       for (const file of extractedFiles) {

//         const filePath =
//           path.join(
//             proofFolder,
//             file
//           );

//         if (fs.existsSync(filePath)) {
//           fs.unlinkSync(filePath);
//         }
//       }

//       // Remove extraction folder
//       if (fs.existsSync(proofFolder)) {
//         fs.rmdirSync(proofFolder);
//       }

//     } catch (cleanupError) {

//       console.error(
//         "Proof cleanup failed:",
//         cleanupError.message
//       );
//     }

//     // ============================================================
//     // 25. FINAL RESPONSE
//     // ============================================================

//     return res.status(200).json({

//       success: errors.length === 0,

//       message:
//         errors.length === 0
//           ? `${updatedCount} proofs uploaded successfully.`
//           : "Bulk proof upload completed with some errors.",

//       summary: {

//         totalRows:
//           excelData.length,

//         matched:
//           matchedCases.length,

//         updated:
//           updatedCount,

//         failed:
//           errors.length,
//       },

//       updatedCases:
//         matchedCases.map(
//           (item) => ({

//             referenceNo:
//               item.referenceNo,

//             status:
//               "COMPLETED",

//             proofFile:
//               item.proofFile,

//             colourCode:
//               item.colourCode,

//             verificationDate:
//               item.verificationDate,

//             verificationRemark:
//               item.verificationRemark,
//           })
//         ),

//       errors,
//     });

//   } catch (error) {

//     console.error(
//       "BULK PROOF UPLOAD ERROR:",
//       error
//     );

//     next(error);
//   }
// };

// ============================================================
// BULK UPLOAD (EXCEL + ZIP)
// Maximum 100 Cases
//
// MATCHING RULE:
// 1. Excel Reference No must match Case.comp_ref_no
// 2. Excel File Name must match ZIP proof filename
// 3. Both must match
//
// Duplicate Reference No is allowed.
// The same MongoDB case cannot be reused in one upload.
// ============================================================

exports.bulkUploadCases = async (req, res, next) => {
  let excelPath = null;
  let zipPath = null;
  let proofFolder = null;

  try {
    // ==========================================================
    // 1. CHECK FILES
    // ==========================================================

    if (
      !req.files?.excel ||
      !req.files?.zip
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Excel file and ZIP file are required.",
      });
    }

    excelPath =
      req.files.excel[0].path;

    zipPath =
      req.files.zip[0].path;


    // ==========================================================
    // 2. READ EXCEL
    // ==========================================================

    const excelData =
      readExcelFile(excelPath);

    if (
      !excelData ||
      !Array.isArray(excelData)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid Excel file.",
      });
    }


    // ==========================================================
    // 3. MAXIMUM 100 CASES
    // ==========================================================

    if (excelData.length > 100) {
      return res.status(400).json({
        success: false,
        message:
          "Maximum 100 cases can be uploaded at once.",
        totalRows:
          excelData.length,
        maxAllowed: 100,
      });
    }

    if (excelData.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Excel file contains no records.",
      });
    }


    // ==========================================================
    // 4. VALIDATE EXCEL STRUCTURE
    // ==========================================================

    validateExcelData(excelData);


    // ==========================================================
    // 5. EXTRACT ZIP
    // ==========================================================

    proofFolder =
      extractZip(zipPath);

    if (
      !proofFolder ||
      !fs.existsSync(proofFolder)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Failed to extract proof ZIP.",
      });
    }


    // ==========================================================
    // 6. READ PROOF FILES
    // ==========================================================

    const proofFiles =
      fs.readdirSync(
        proofFolder
      );

    const errors = [];

    const matchedCases = [];

    const updatedCases = [];

    // IMPORTANT:
    // Prevent the same MongoDB case from being
    // matched against multiple Excel rows.
    const usedCaseIds =
      new Set();


    // ==========================================================
    // 7. PROCESS EVERY EXCEL ROW
    //
    // One failed row does NOT stop remaining rows.
    // ==========================================================

    for (
      let index = 0;
      index < excelData.length;
      index++
    ) {
      const row =
        excelData[index];

      const rowNumber =
        index + 2;


      // --------------------------------------------------------
      // ROW VALIDATION
      // --------------------------------------------------------

      const rowErrors =
        validateExcelRow(
          row,
          index
        );

      if (
        rowErrors.length
      ) {
        errors.push(
          ...rowErrors
        );

        continue;
      }


      // --------------------------------------------------------
      // BASIC VALUES
      // --------------------------------------------------------

      const referenceNo =
        String(
          row["Reference No"] ||
            ""
        ).trim();

      const fileName =
        String(
          row["File Name"] ||
            ""
        ).trim();

      const verifyStatus =
        String(
          row["Verify Status"] ||
            ""
        ).trim();


      // ========================================================
      // 8. MATCH PROOF FILE
      //
      // Excel:
      // File Name = MS-03
      //
      // ZIP:
      // MS-03.pdf
      //
      // We compare the filename WITHOUT extension.
      //
      // This is an exact filename comparison.
      // ========================================================

      const matchedFile =
        proofFiles.find(
          (file) => {

            const zipBaseName =
              path
                .parse(file)
                .name
                .trim();

            return (
              zipBaseName ===
              fileName
            );
          }
        );


      if (!matchedFile) {
        errors.push({
          row:
            rowNumber,

          applicationId:
            referenceNo,

          type:
            "MISSING_PROOF",

          reason:
            `Proof file not found in ZIP. Expected: ${fileName}`,

          fileName,
        });

        continue;
      }


      // ========================================================
      // 9. FIND CASE BY REFERENCE NO
      //
      // IMPORTANT:
      // comp_ref_no CAN be duplicated.
      //
      // Therefore we exclude MongoDB cases which have already
      // been used by another Excel row in this same upload.
      // ========================================================

      const usedIds =
        Array.from(
          usedCaseIds
        );


      const caseQuery = {
        comp_ref_no:
          referenceNo,

        check_status: {
          $ne:
            "COMPLETED",
        },
      };


      if (
        usedIds.length
      ) {
        caseQuery._id = {
          $nin:
            usedIds,
        };
      }


      const caseItem =
        await Case.findOne(
          caseQuery
        ).sort({
          createdAt: 1,
        });


      // ========================================================
      // 9A. CASE NOT FOUND / NO AVAILABLE CASE
      // ========================================================

      if (!caseItem) {

        // ------------------------------------------------------
        // Check whether Reference No exists at all
        // ------------------------------------------------------

        const existingCases =
          await Case.find({
            comp_ref_no:
              referenceNo,
          }).select(
            "_id check_status"
          );


        if (
          !existingCases.length
        ) {

          errors.push({
            row:
              rowNumber,

            applicationId:
              referenceNo,

            type:
              "CASE_NOT_FOUND",

            reason:
              "Case not found in the system.",

            fileName,
          });

          continue;
        }


        // ------------------------------------------------------
        // Check whether every matching case is completed
        // ------------------------------------------------------

        const allCompleted =
          existingCases.every(
            (item) =>
              String(
                item.check_status
              ).toUpperCase() ===
              "COMPLETED"
          );


        if (
          allCompleted
        ) {

          errors.push({
            row:
              rowNumber,

            applicationId:
              referenceNo,

            type:
              "ALREADY_COMPLETED",

            reason:
              "All cases with this Reference No are already completed.",

            fileName,
          });

          continue;
        }


        // ------------------------------------------------------
        // Cases exist but all available cases have already
        // been consumed by previous rows in this upload.
        // ------------------------------------------------------

        errors.push({
          row:
            rowNumber,

          applicationId:
            referenceNo,

          type:
            "NO_AVAILABLE_CASE",

          reason:
            "No unused case is available for this Reference No.",

          fileName,
        });

        continue;
      }


      // ========================================================
      // 10. RESERVE THIS CASE
      //
      // IMPORTANT:
      // If the same Reference No appears again in Excel,
      // this exact MongoDB case will not be selected again.
      // ========================================================

      usedCaseIds.add(
        String(
          caseItem._id
        )
      );


      // ========================================================
      // 11. VERIFY STATUS
      // ========================================================

      if (
        verifyStatus.toLowerCase() !==
        "completed"
      ) {

        errors.push({
          row:
            rowNumber,

          applicationId:
            referenceNo,

          type:
            "INVALID_STATUS",

          reason:
            `Verify Status is "${verifyStatus}". Only "Completed" cases can be processed.`,

          fileName,
        });

        continue;
      }


      // ========================================================
      // 12. STORE MATCHED CASE INFORMATION
      // ========================================================

      matchedCases.push({

        row:
          rowNumber,

        referenceNo,

        dbCaseId:
          caseItem._id,

        proofFile:
          matchedFile,

        verifyStatus,

        colourCode:
          String(
            row["Colour Code"] ||
              ""
          ).trim(),

        verificationDate:
          row["Verification Date"],

        verificationRemark:
          String(
            row[
              "Verification Remark"
            ] || ""
          ).trim(),
      });


      console.log(
        `✅ Matched Reference No: ${referenceNo} -> Case: ${caseItem._id} -> Proof: ${matchedFile}`
      );
    }


    // ==========================================================
    // 13. UPDATE MATCHED CASES
    // ==========================================================

    let updatedCount =
      0;


    for (
      const item of matchedCases
    ) {

      let copiedProofPath =
        null;


      try {

        // ======================================================
        // 13A. FIND CASE AGAIN
        // ======================================================

        const caseItem =
          await Case.findById(
            item.dbCaseId
          );


        if (!caseItem) {

          errors.push({
            row:
              item.row,

            applicationId:
              item.referenceNo,

            type:
              "CASE_NOT_FOUND",

            reason:
              "Case no longer exists.",

            fileName:
              item.proofFile,
          });

          continue;
        }


        // ======================================================
        // 13B. SAFETY CHECK
        // ======================================================

        if (
          String(
            caseItem.check_status
          ).toUpperCase() ===
          "COMPLETED"
        ) {

          errors.push({
            row:
              item.row,

            applicationId:
              item.referenceNo,

            type:
              "ALREADY_COMPLETED",

            reason:
              "Case was completed before it could be updated.",

            fileName:
              item.proofFile,
          });

          continue;
        }


        // ======================================================
        // 14. FIND SOURCE PROOF
        // ======================================================

        const sourcePath =
          path.join(
            proofFolder,
            item.proofFile
          );


        if (
          !fs.existsSync(
            sourcePath
          )
        ) {

          errors.push({
            row:
              item.row,

            applicationId:
              item.referenceNo,

            type:
              "MISSING_PROOF",

            reason:
              "Proof file could not be found while processing.",

            fileName:
              item.proofFile,
          });

          continue;
        }


        // ======================================================
        // 15. PERMANENT PROOF DIRECTORY
        // ======================================================

        const proofsDirectory =
          path.resolve(
            __dirname,
            "../uploads/proofs"
          );


        if (
          !fs.existsSync(
            proofsDirectory
          )
        ) {

          fs.mkdirSync(
            proofsDirectory,
            {
              recursive:
                true,
            }
          );
        }


        // ======================================================
        // 16. UNIQUE FILE NAME
        // ======================================================

        const uniqueFileName =
          `${Date.now()}-${Math.round(
            Math.random() * 1e9
          )}${path.extname(
            item.proofFile
          )}`;


        const destinationPath =
          path.join(
            proofsDirectory,
            uniqueFileName
          );


        // ======================================================
        // 17. COPY PROOF
        // ======================================================

        fs.copyFileSync(
          sourcePath,
          destinationPath
        );


        copiedProofPath =
          destinationPath;


        // ======================================================
        // 18. SAVE PROOF
        // ======================================================

        caseItem.proof_document =
          `/uploads/proofs/${uniqueFileName}`;


        // ======================================================
        // 19. VERIFICATION RESULT
        // ======================================================

        const colourMap = {

          green:
            "GREEN",

          red:
            "RED",

          orange:
            "ORANGE",

          insufficient:
            "INSUFFICIENT",
        };


        const colourCode =
          String(
            item.colourCode ||
              ""
          )
            .trim()
            .toLowerCase();


        caseItem.verification_result =
          colourMap[
            colourCode
          ] || null;


        // ======================================================
        // 20. VERIFICATION REMARK
        // ======================================================

        caseItem.verification_remark =
          item.verificationRemark ||
          "";


        // ======================================================
        // 21. VERIFICATION DATE
        // ======================================================

        if (
          item.verificationDate
        ) {

          caseItem.verified_date =
            excelDateToJSDate(
              item.verificationDate
            );

        } else {

          caseItem.verified_date =
            new Date();
        }


        // ======================================================
        // 22. VERIFIED BY
        // ======================================================

        caseItem.verified_by =
          req.user._id;


        // ======================================================
        // 23. STATUS
        // ======================================================

        caseItem.check_status =
          "COMPLETED";


        // ======================================================
        // 24. OLD RECORD SAFETY
        // ======================================================

        if (
          !caseItem.user
        ) {

          caseItem.user =
            req.user._id;
        }


        // ======================================================
        // 25. SAVE CASE
        // ======================================================

        await caseItem.save();

        updatedCount++;


        console.log(
          `✅ Case completed -> ${item.referenceNo} -> ${caseItem._id}`
        );


        // ======================================================
        // 26. ADD SUCCESSFUL CASE
        // ======================================================

        updatedCases.push({

          row:
            item.row,

          applicationId:
            item.referenceNo,

          dbCaseId:
            caseItem._id,

          status:
            "COMPLETED",

          proofFile:
            item.proofFile,

          colourCode:
            item.colourCode,

          verificationDate:
            item.verificationDate,

          verificationRemark:
            item.verificationRemark,
        });


        // ======================================================
        // 27. PROOF WEBHOOK
        // ======================================================

        try {

          await sendProofWebhook(
            caseItem
          );

          console.log(
            `📤 Proof webhook sent -> ${item.referenceNo} -> ${caseItem.vendor}`
          );

        } catch (
          webhookError
        ) {

          console.error(
            `❌ Proof webhook failed -> ${item.referenceNo}:`,
            webhookError.message
          );
        }


        // ======================================================
        // 28. AUDIT LOG
        // ======================================================

        try {

          await createAuditLog({

            userId:
              req.user.id,

            action:
              "BULK_PROOF_UPLOAD",

            caseId:
              caseItem._id,

            details:
              `Proof uploaded through bulk upload for ${caseItem.comp_ref_no}`,

            module:
              "CASE",
          });

        } catch (
          auditError
        ) {

          console.error(
            "Audit log failed:",
            auditError.message
          );
        }


      } catch (
        rowProcessingError
      ) {

        // ======================================================
        // UNEXPECTED ERROR FOR THIS ROW
        //
        // Remaining rows continue.
        // ======================================================

        console.error(
          `❌ Row processing failed -> ${item.referenceNo}:`,
          rowProcessingError
        );


        // ------------------------------------------------------
        // IMPORTANT:
        // If proof was copied but DB save failed,
        // remove the orphaned proof file.
        // ------------------------------------------------------

        try {

          if (
            copiedProofPath &&
            fs.existsSync(
              copiedProofPath
            )
          ) {

            fs.unlinkSync(
              copiedProofPath
            );

          }

        } catch (
          cleanupError
        ) {

          console.error(
            "Failed to remove orphan proof:",
            cleanupError.message
          );
        }


        errors.push({

          row:
            item.row,

          applicationId:
            item.referenceNo,

          type:
            "PROCESSING_ERROR",

          reason:
            rowProcessingError.message ||
            "Unexpected error while processing case.",

          fileName:
            item.proofFile ||
            "",
        });
      }
    }


    // ==========================================================
    // 29. CLEANUP EXCEL + ZIP
    // ==========================================================

    try {

      if (
        excelPath &&
        fs.existsSync(
          excelPath
        )
      ) {

        fs.unlinkSync(
          excelPath
        );
      }


      if (
        zipPath &&
        fs.existsSync(
          zipPath
        )
      ) {

        fs.unlinkSync(
          zipPath
        );
      }

    } catch (
      cleanupError
    ) {

      console.error(
        "Excel/ZIP cleanup failed:",
        cleanupError.message
      );
    }


    // ==========================================================
    // 30. CLEANUP EXTRACTED FILES
    // ==========================================================

    try {

      if (
        proofFolder &&
        fs.existsSync(
          proofFolder
        )
      ) {

        const extractedFiles =
          fs.readdirSync(
            proofFolder
          );


        for (
          const file
          of extractedFiles
        ) {

          const filePath =
            path.join(
              proofFolder,
              file
            );


          if (
            fs.existsSync(
              filePath
            )
          ) {

            fs.unlinkSync(
              filePath
            );
          }
        }


        if (
          fs.existsSync(
            proofFolder
          )
        ) {

          fs.rmdirSync(
            proofFolder
          );
        }
      }

    } catch (
      cleanupError
    ) {

      console.error(
        "Proof cleanup failed:",
        cleanupError.message
      );
    }


    // ==========================================================
    // 31. FINAL SUMMARY
    // ==========================================================

    const totalRows =
      excelData.length;

    const successful =
      updatedCount;

    const failed =
      errors.length;

    const processed =
      successful +
      failed;


    // ==========================================================
    // 32. FINAL RESPONSE
    // ==========================================================

    return res.status(200).json({

      success:
        failed === 0,

      message:
        failed === 0
          ? `${successful} case(s) processed successfully.`
          : "Bulk upload completed with some errors.",


      summary: {

        total:
          totalRows,

        processed,

        successful,

        failed,

        // Backward compatibility
        totalRows,

        matched:
          matchedCases.length,

        updated:
          updatedCount,
      },


      // ========================================================
      // SUCCESSFUL CASES ONLY
      // ========================================================

      updatedCases,


      // ========================================================
      // FAILED ROWS
      // ========================================================

      errors,
    });

  } catch (
    error
  ) {

    console.error(
      "BULK PROOF UPLOAD ERROR:",
      error
    );


    // ==========================================================
    // EMERGENCY CLEANUP
    // ==========================================================

    try {

      if (
        excelPath &&
        fs.existsSync(
          excelPath
        )
      ) {

        fs.unlinkSync(
          excelPath
        );
      }


      if (
        zipPath &&
        fs.existsSync(
          zipPath
        )
      ) {

        fs.unlinkSync(
          zipPath
        );
      }

    } catch (
      cleanupError
    ) {

      console.error(
        "Emergency cleanup failed:",
        cleanupError.message
      );
    }


    next(error);
  }
};