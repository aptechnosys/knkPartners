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

//GetSingleCase

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



exports.saveVerification =
async (req, res, next) => {

  try {

    const {
      verification_result,
      verification_remark,
      proof_document,
    } = req.body;

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

    caseData.verification_result =
      verification_result;

    caseData.verification_remark =
      verification_remark;

    caseData.proof_document =
      proof_document || "";

    caseData.verified_by =
      req.user._id;

    caseData.verified_date =
      new Date();

    // Auto move to Q_CHECK
    caseData.check_status =
      "Q_CHECK";

    await caseData.save();

    await sendWebhook(caseData);

    await createAuditLog({
      userId: req.user.id,
      action: "VERIFICATION_SAVED",
      caseId: caseData._id,
      details:
        `Verification result: ${verification_result}`,
      module: "CASE",
    });

    res.status(200).json({
      success: true,
      message:
        "Verification saved successfully",
      data: caseData,
    });

  } catch (error) {
    next(error);
  }
};

// upload proof document 
exports.uploadProofDocument = async (req, res, next) => {
  try {
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Save proof document path
    caseItem.proof_document =
      `/uploads/proofs/${req.file.filename}`;

    await caseItem.save();

    // Send proof update webhook to client
    await sendProofWebhook(caseItem);

    res.status(200).json({
      success: true,
      message: "Proof uploaded successfully",
      proof_document: caseItem.proof_document,
    });

  } catch (error) {
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


// BULK UPLOAD (EXCEL + ZIP)
// Maximum 100 Cases


exports.bulkUploadCases = async (req, res, next) => {
  try {
    
    // 1. CHECK FILES
    

    if (!req.files?.excel || !req.files?.zip) {
      return res.status(400).json({
        success: false,
        message: "Excel file and ZIP file are required.",
      });
    }

    const excelPath = req.files.excel[0].path;
    const zipPath = req.files.zip[0].path;

    // ============================================
    // 2. READ EXCEL
    // ============================================

    const excelData = readExcelFile(excelPath);

    if (!excelData || !Array.isArray(excelData)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Excel file.",
      });
    }

    // ============================================
    // 3. MAXIMUM 100 CASES
    // ============================================

    if (excelData.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 cases can be uploaded at once.",
        totalRows: excelData.length,
        maxAllowed: 100,
      });
    }

    if (excelData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Excel file contains no records.",
      });
    }

    // ============================================
    // 4. VALIDATE EXCEL
    // ============================================

    validateExcelData(excelData);

    // ============================================
    // 5. EXTRACT ZIP
    // ============================================

    const proofFolder = extractZip(zipPath);

    if (!fs.existsSync(proofFolder)) {
      return res.status(400).json({
        success: false,
        message: "Failed to extract proof ZIP.",
      });
    }

    // ============================================
    // 6. READ PROOF FILES
    // ============================================

    const proofFiles = fs.readdirSync(proofFolder);

    const matchedCases = [];
    const errors = [];

    // ============================================
    // 7. MATCH EXCEL WITH ZIP
    // ============================================

    for (const row of excelData) {
      const referenceNo = String(
        row["Reference No"] || ""
      ).trim();

      const fileName = String(
        row["File Name"] || ""
      ).trim();

      if (!referenceNo) {
        errors.push(
          "Reference No is missing in Excel."
        );
        continue;
      }

      if (!fileName) {
        errors.push(
          `File Name is missing for ${referenceNo}.`
        );
        continue;
      }

      // Match filename without extension
      const matchedFile = proofFiles.find(
        (file) =>
          path.parse(file).name.trim() ===
          fileName
      );

      if (!matchedFile) {
        errors.push(
          `Proof file not found for ${referenceNo} (Expected: ${fileName})`
        );
        continue;
      }

      // ============================================
      // 8. FIND CASE
      // ============================================

      const caseItem = await Case.findOne({
        comp_ref_no: referenceNo,
      });

      if (!caseItem) {
        errors.push(
          `Case not found for Reference No ${referenceNo}`
        );
        continue;
      }

      // ============================================
      // 9. PREVENT DUPLICATE COMPLETED CASE
      // ============================================

      if (
        String(caseItem.check_status)
          .toUpperCase() === "COMPLETED"
      ) {
        errors.push(
          `${referenceNo} is already completed.`
        );
        continue;
      }

      matchedCases.push({
        referenceNo,
        dbCaseId: caseItem._id,
        proofFile: matchedFile,

        verifyStatus: String(
          row["Verify Status"] || ""
        ).trim(),

        colourCode: String(
          row["Colour Code"] || ""
        ).trim(),

        verificationDate:
          row["Verification Date"],
      });

      console.log(
        `✅ Matched ${referenceNo} -> ${matchedFile}`
      );
    }

    // ============================================
    // 10. UPDATE CASES
    // ============================================

    let updatedCount = 0;

    for (const item of matchedCases) {
      const caseItem = await Case.findById(
        item.dbCaseId
      );

      if (!caseItem) {
        errors.push(
          `Case ${item.referenceNo} no longer exists.`
        );
        continue;
      }

      // ============================================
      // VERIFY STATUS
      // ============================================

      const verifyStatus =
        item.verifyStatus.toLowerCase();

      if (verifyStatus !== "completed") {
        errors.push(
          `${item.referenceNo}: Verify Status must be Completed.`
        );
        continue;
      }

      // ============================================
      // 11. COPY PROOF INTO PERMANENT PROOF FOLDER
      // ============================================

      const sourcePath = path.join(
        proofFolder,
        item.proofFile
      );

      const proofsDirectory = path.resolve(
        __dirname,
        "../uploads/proofs"
      );

      if (!fs.existsSync(proofsDirectory)) {
        fs.mkdirSync(proofsDirectory, {
          recursive: true,
        });
      }

      // Generate unique filename
      const uniqueFileName =
        `${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}${path.extname(item.proofFile)}`;

      const destinationPath = path.join(
        proofsDirectory,
        uniqueFileName
      );

      // Copy ZIP proof to permanent folder
      fs.copyFileSync(
        sourcePath,
        destinationPath
      );

      // ============================================
      // 12. SAVE PROOF PATH
      // ============================================

      caseItem.proof_document =
        `/uploads/proofs/${uniqueFileName}`;

      // ============================================
      // 13. VERIFICATION RESULT
      // ============================================

      const colourMap = {
        green: "GREEN",
        red: "RED",
        orange: "ORANGE",
        insufficient: "INSUFFICIENT",
      };

      caseItem.verification_result =
        colourMap[
          item.colourCode.toLowerCase()
        ] || null;

      // ============================================
      // 14. VERIFICATION DATE
      // ============================================

      if (item.verificationDate) {
        caseItem.verified_date =
          excelDateToJSDate(
            item.verificationDate
          );
      } else {
        caseItem.verified_date = new Date();
      }

      // ============================================
      // 15. VERIFIED BY
      // ============================================

      caseItem.verified_by =
        req.user._id;

      // ============================================
      // 16. STATUS
      // ============================================

      caseItem.check_status =
        "COMPLETED";

      // ============================================
      // 17. OLD RECORD SAFETY
      // ============================================

      if (!caseItem.user) {
        caseItem.user = req.user._id;
      }

      // ============================================
      // 18. SAVE CASE
      // ============================================

      await caseItem.save();

      updatedCount++;

      // ============================================
      // 19. PROOF WEBHOOK
      // ============================================

      try {
        await sendProofWebhook(caseItem);

        console.log(
          `📤 Proof webhook sent -> ${item.referenceNo}`
        );
      } catch (webhookError) {
        console.error(
          `Proof webhook failed -> ${item.referenceNo}:`,
          webhookError.message
        );
      }

      // ============================================
      // 20. AUDIT LOG
      // ============================================

      try {
        await createAuditLog({
          userId: req.user.id,

          action: "BULK_PROOF_UPLOAD",

          caseId: caseItem._id,

          details:
            `Proof uploaded through bulk upload for ${caseItem.comp_ref_no}`,

          module: "CASE",
        });
      } catch (auditError) {
        console.error(
          "Audit log failed:",
          auditError.message
        );
      }
    }

    // ============================================
    // 21. CLEANUP EXCEL + ZIP
    // ============================================

    try {
      if (fs.existsSync(excelPath)) {
        fs.unlinkSync(excelPath);
      }

      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
    } catch (cleanupError) {
      console.error(
        "Excel/ZIP cleanup failed:",
        cleanupError.message
      );
    }

    // ============================================
    // 22. CLEANUP EXTRACTED FILES
    // ============================================

    try {
      const extractedFiles =
        fs.readdirSync(proofFolder);

      for (const file of extractedFiles) {
        const filePath =
          path.join(
            proofFolder,
            file
          );

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Remove extraction folder
      if (fs.existsSync(proofFolder)) {
        fs.rmdirSync(proofFolder);
      }
    } catch (cleanupError) {
      console.error(
        "Proof cleanup failed:",
        cleanupError.message
      );
    }

    // ============================================
    // 23. FINAL RESPONSE
    // ============================================

    return res.status(200).json({
      success: errors.length === 0,

      message:
        errors.length === 0
          ? `${updatedCount} proofs uploaded successfully.`
          : "Bulk proof upload completed with some errors.",

      summary: {
        totalRows: excelData.length,

        matched: matchedCases.length,

        updated: updatedCount,

        failed: errors.length,
      },

      updatedCases: matchedCases.map(
        (item) => ({
          referenceNo:
            item.referenceNo,

          status: "COMPLETED",

          proofFile:
            item.proofFile,

          colourCode:
            item.colourCode,

          verificationDate:
            item.verificationDate,
        })
      ),

      errors,
    });
  } catch (error) {
    console.error(
      "BULK PROOF UPLOAD ERROR:",
      error
    );

    next(error);
  }
};