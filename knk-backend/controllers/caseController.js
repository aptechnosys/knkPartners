const Case = require("../models/Case");
const fs = require("fs");
const path = require("path");
const createAuditLog = require("../utils/auditLogger");
const sendWebhook = require("../utils/sendWebhook");
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
    const allCases =
      await Case.find(filter);

    // OVERDUE CALCULATION
    const overdueCases =
      allCases.filter((c) => {

        // must have TAT
        if (!c.tat)
          return false;

        const status =
          (c.check_status || "")
            .toUpperCase();

        // ignore final/closed cases
        if (
          [
            "DONE",
            "REJECTED",
            "STOPPED",
            "INSUFFICIENT"
          ].includes(status)
        ) {
          return false;
        }

        const deadline =
          new Date(c.createdAt);

        deadline.setDate(
          deadline.getDate() +
          Number(c.tat)
        );

        return (
          deadline <
          new Date()
        );

      }).length;

    const totalCases =
      await Case.countDocuments(filter);

    // Bell icon / NEW cases
    const newCases =
      await Case.countDocuments({
        ...filter,
        check_status: "NEW"
      });

    // Active / unfinished cases
    const pendingCases =
      await Case.countDocuments({
        ...filter,
        check_status: {
          $nin: [
            "DONE",
            "REJECTED",
            "STOPPED",
            "INSUFFICIENT"
          ]
        }
      });

    const inProgressCases =
      await Case.countDocuments({
        ...filter,
        check_status: "IN_PROGRESS"
      });

    const qCheckCases =
      await Case.countDocuments({
        ...filter,
        check_status: "Q_CHECK"
      });

    const doneCases =
      await Case.countDocuments({
        ...filter,
        check_status: "DONE"
      });

    const insufficientCases =
      await Case.countDocuments({
        ...filter,
        check_status: "INSUFFICIENT"
      });

    const onHoldCases =
      await Case.countDocuments({
        ...filter,
        check_status: "ON_HOLD"
      });

    const stoppedCases =
      await Case.countDocuments({
        ...filter,
        check_status: "STOPPED"
      });

    const rejectedCases =
      await Case.countDocuments({
        ...filter,
        check_status: "REJECTED"
      });

    res.status(200).json({
      success: true,
      data: {
        totalCases,
        pendingCases,
        overdueCases,
        newCases,
        inProgressCases,
        qCheckCases,
        doneCases,
        insufficientCases,
        onHoldCases,
        stoppedCases,
        rejectedCases
      }
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

exports.uploadProofDocument =
  async (req, res, next) => {

    try {

      const caseItem =
        await Case.findById(
          req.params.id
        );

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

      caseItem.proof_document =
        `/uploads/proofs/${req.file.filename}`;

      await caseItem.save();

      res.status(200).json({
        success: true,
        message:
          "Proof uploaded successfully",
        proof_document:
          caseItem.proof_document,
      });

    } catch (error) {
      next(error);
    }
  };


  // To Archive cases

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

    const updatedCase =
      await Case.findByIdAndUpdate(
        req.params.id,
        {
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
        },
        {
          new: true,
        }
      );

    if (!updatedCase) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Case restored successfully",
      data: updatedCase,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};



// Multiple select 
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

// Bulk Upload (Excel + ZIP)
exports.bulkUploadCases = async (req, res, next) => {
  try {
    // Check uploaded files
    if (!req.files?.excel || !req.files?.zip) {
      return res.status(400).json({
        success: false,
        message: "Excel file and ZIP file are required.",
      });
    }

    // Uploaded file paths
    const excelPath = req.files.excel[0].path;
    const zipPath = req.files.zip[0].path;

    // Read Excel
    const excelData = readExcelFile(excelPath);

    

    // Validate Excel
    validateExcelData(excelData);

    

    // Extract ZIP
    const proofFolder = extractZip(zipPath);

    // Read all extracted proof files
    const proofFiles = fs.readdirSync(proofFolder);

    const matchedCases = [];
    const errors = [];

    for (const row of excelData) {

      // Match proof file by filename (without extension)
      const matchedFile = proofFiles.find(
        (file) =>
          path.parse(file).name.trim() ===
          String(row["File Name"]).trim()
      );

      if (!matchedFile) {
        errors.push(
          `Proof file not found for Reference No ${row["Reference No"]} (Expected: ${row["File Name"]})`
        );
        continue;
      }

      // Find Case in Database
      const caseItem = await Case.findOne({
        comp_ref_no: row["Reference No"],
      });

      if (!caseItem) {
        errors.push(
          `Case not found for Reference No ${row["Reference No"]}`
        );
        continue;
      }

      matchedCases.push({
        referenceNo: row["Reference No"],
        dbCaseId: caseItem._id,
        proofFile: matchedFile,
        verifyStatus: row["Verify Status"],
        colourCode: row["Colour Code"],
        verificationDate: row["Verification Date"],
      });

      console.log(
        `✅ ${row["Reference No"]} -> ${matchedFile}`
      );
    }
     
//     for (const item of matchedCases) {
//   const caseItem = await Case.findById(item.dbCaseId);

//   if (!caseItem) continue;

//   // Proof Path
//   caseItem.proof_document = `/uploads/proofs/${item.proofFile}`;

//   // Verification Date
//   caseItem.verified_date = new Date(item.verificationDate);

//   // Verification Result
//   caseItem.verification_result = item.verifyStatus;

//   // Status
//   caseItem.check_status =
//     item.verifyStatus === "Completed"
//       ? "DONE"
//       : "STOPPED";

//   // Optional colour code
//   caseItem.colour_code = item.colourCode;

//   // Who verified
//   caseItem.verified_by = req.user._id;

//   await caseItem.save();

//   await sendWebhook(caseItem);

//   await createAuditLog({
//     userId: req.user.id,
//     action: "BULK_UPLOAD_COMPLETED",
//     caseId: caseItem._id,
//     details: `Bulk upload updated case ${caseItem.comp_ref_no}`,
//     module: "CASE",
//   });
// }

let updatedCount = 0;

for (const item of matchedCases) {
  const caseItem = await Case.findById(item.dbCaseId);

  if (!caseItem) continue;

  // Prevent duplicate verification
  if (caseItem.check_status === "DONE") {
    errors.push(`${caseItem.comp_ref_no} is already verified.`);
    continue;
  }

  // Proof document
  caseItem.proof_document = `/uploads/proofs/${item.proofFile}`;

  // Verification Date
  caseItem.verified_date = excelDateToJSDate(
    item.verificationDate
  );

  // Verification Result
  const colourMap = {
    green: "GREEN",
    red: "RED",
    orange: "ORANGE",
    insufficient: "INSUFFICIENT",
  };

  caseItem.verification_result =
    colourMap[
      String(item.colourCode || "").toLowerCase()
    ] || null;

  // Verified By
  caseItem.verified_by = req.user._id;

  // Status Mapping
  caseItem.check_status =
    String(item.verifyStatus).toLowerCase() === "completed"
      ? "DONE"
      : "STOPPED";

  // Old records may not have user
  if (!caseItem.user) {
    caseItem.user = req.user._id;
  }

  // Save
  await caseItem.save();

  updatedCount++;

  // Webhook
  try {
    await sendWebhook(caseItem);
  } catch (err) {
    console.log(
      "Webhook Failed:",
      err.message
    );
  }

  // Audit Log
  try {
    await createAuditLog({
      userId: req.user.id,
      action: "BULK_UPLOAD",
      caseId: caseItem._id,
      details: `Bulk Upload Completed`,
      module: "CASE",
    });
  } catch (err) {
    console.log(
      "Audit Failed:",
      err.message
    );
  }
}

// ===============================
// Cleanup uploaded Excel & ZIP
// ===============================
try {
  if (fs.existsSync(excelPath)) {
    fs.unlinkSync(excelPath);
  }

  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
} catch (err) {
  console.log(
    "File cleanup failed:",
    err.message
  );
}

// ===============================
// Cleanup extracted proof files
// ===============================
try {
  const extractedFiles =
    fs.readdirSync(proofFolder);

  for (const file of extractedFiles) {
    const filePath =
      path.join(proofFolder, file);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
} catch (err) {
  console.log(
    "Proof cleanup failed:",
    err.message
  );
}

// ===============================
// Final Response
// ===============================
return res.status(200).json({
  success: errors.length === 0,
  message:
    errors.length === 0
      ? `${updatedCount} cases updated successfully.`
      : "Bulk upload completed with some errors.",

  summary: {
    totalRows: excelData.length,
    matched: matchedCases.length,
    updated: updatedCount,
    failed: errors.length,
  },

  updatedCases: matchedCases.map((item) => ({
    referenceNo: item.referenceNo,
    status:
      String(item.verifyStatus).toLowerCase() ===
      "completed"
        ? "DONE"
        : "STOPPED",
    proofFile: item.proofFile,
    colourCode: item.colourCode,
    verificationDate: item.verificationDate,
  })),

  errors,
});
} catch (error) {
  next(error);
}
};