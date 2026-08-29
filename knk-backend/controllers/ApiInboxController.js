const ApiRequest = require("../models/ApiRequest");
const Case = require("../models/Case");
const User = require("../models/User");
const createApiLog = require("../utils/ApiLogger");

// ============================================================
// PARSE CLIENT DOB
// Client sends DOB in DD-MM-YYYY format
// Example: "15-12-1996"
// ============================================================
const parseClientDob = (dob) => {
  if (!dob) return null;

  // If already a Date
  if (dob instanceof Date) {
    return isNaN(dob.getTime()) ? null : dob;
  }

  const value = String(dob).trim();

  // Client format: DD-MM-YYYY
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(year, month - 1, day);

    // Make sure invalid dates like 31-02-1996 are rejected
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }

    return null;
  }

  // Fallback for ISO/other valid date formats
  const date = new Date(value);

  return isNaN(date.getTime()) ? null : date;
};

// ============================================================
// APPLICATION ID VALIDATION
// Allowed:
// Letters, numbers, hyphen (-), underscore (_)
//
// Examples:
// PL-108       ✅
// 190657       ✅
// ABC123       ✅
// ABC_123      ✅
// PL_2026-001  ✅
// ============================================================
const isValidApplicationId = (applicationId) => {
  return (
    typeof applicationId === "string" &&
    /^[A-Za-z0-9_-]+$/.test(applicationId.trim())
  );
};

// ============================================================
// GET ALL API REQUESTS
// ============================================================
const getApiRequests = async (req, res) => {
  try {
    const requests = await ApiRequest.find({
      processed: false,
    }).sort({
      createdAt: -1,
    });

    res.json(requests);
  } catch (error) {
    console.error("GET API REQUESTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// CREATE NEW API REQUEST
// ============================================================
const createApiRequest = async (req, res) => {
  try {
    const {
      applicationId,
      candidateName,
      fatherName,
      dob,
      address,
      city,
      state,
      pincode,
      tat,
      remark,
      attachment,
    } = req.body;

    // --------------------------------------------------------
    // Application ID required
    // --------------------------------------------------------
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    // --------------------------------------------------------
    // Application ID format validation
    // --------------------------------------------------------
    if (!isValidApplicationId(applicationId)) {
      return res.status(400).json({
        success: false,
        message:
          "Application ID can contain only letters, numbers, hyphens (-), and underscores (_)",
      });
    }

    // --------------------------------------------------------
    // CREATE API REQUEST
    //
    // Duplicate application IDs are intentionally allowed.
    // --------------------------------------------------------
    const request = await ApiRequest.create({
      applicationId: applicationId.trim(),

      candidateName,
      fatherName,
      dob,

      address,

      city,
      state,
      pincode,

      tat,
      remark,
      attachment,

      // Vendor comes ONLY from API key middleware.
      vendor: req.vendor,
    });

    // --------------------------------------------------------
    // API LOG
    // --------------------------------------------------------
    await createApiLog({
      appId: request.applicationId || "",
      endpoint: req.originalUrl,
      method: req.method,
      status: "SUCCESS",
      source: req.vendor || "Client API",

      requestBody: req.body,

      responseBody: {
        message: "API request received",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Request received successfully",
      applicationId: request.applicationId,
      status: "PENDING",
      vendor: req.vendor,
      receivedAt: request.createdAt,
    });
  } catch (error) {
    console.error("CREATE API REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================================
// PROCESS SINGLE API REQUEST -> CREATE REAL CASE
// ============================================================
const processApiRequest = async (req, res) => {
  try {
    // --------------------------------------------------------
    // Find API request by MongoDB _id
    // --------------------------------------------------------
    const request = await ApiRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "API request not found",
      });
    }

    // --------------------------------------------------------
    // Prevent processing THE SAME API REQUEST twice
    //
    // We intentionally do NOT check applicationId.
    //
    // Therefore:
    //
    // ApiRequest #1 -> PL-108 -> can be processed
    // ApiRequest #2 -> PL-108 -> can also be processed
    // --------------------------------------------------------
    if (request.processed) {
      return res.status(400).json({
        success: false,
        message: "Already processed",
      });
    }

    // --------------------------------------------------------
    // Find default admin user
    // --------------------------------------------------------
    const defaultUser = await User.findOne({
      role: "admin",
    });

    if (!defaultUser) {
      return res.status(404).json({
        success: false,
        message: "No admin user found",
      });
    }

    // --------------------------------------------------------
    // Application ID becomes Case reference number
    // --------------------------------------------------------
    const comp_ref_no = request.applicationId;

    // --------------------------------------------------------
    // CREATE REAL CASE
    //
    // No Case.findOne({ comp_ref_no }) check because duplicate
    // application IDs are allowed.
    // --------------------------------------------------------
    const newCase = await Case.create({
      comp_ref_no,

      user: defaultUser._id,

      check_status: "NEW",

      callback_url: "",

      candidate_name: request.candidateName,

      father_name: request.fatherName,

      candidate_dob: parseClientDob(request.dob),

      // Candidate address
      address: request.address || "",

      city: request.city || "",

      state: request.state || "",

      pincode: request.pincode || "",

      vendor: request.vendor,

      tat: request.tat,

      remark: request.remark,

      attachment: request.attachment,
    });

    // --------------------------------------------------------
    // Mark THIS API request as processed
    // --------------------------------------------------------
    request.processed = true;

    await request.save();

    // --------------------------------------------------------
    // API LOG FOR PROCESSING
    // --------------------------------------------------------
    await createApiLog({
      appId: request.applicationId || "",

      endpoint: req.originalUrl,

      method: req.method,

      status: "PROCESSED",

      source: "Client API",

      requestBody: {
        apiRequestId: request._id,
      },

      responseBody: {
        caseId: newCase._id,

        message: "Case created successfully",
      },
    });

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------
    return res.json({
      success: true,

      message: "Case created successfully",

      case: newCase,
    });
  } catch (error) {
    console.error("PROCESS API REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// BULK CLIENT API REQUESTS
//
// Client can submit up to 100 requests.
//
// Duplicate applicationIds ARE ALLOWED.
//
// Example:
//
// PL-108 -> Address 1
// PL-108 -> Address 2
//
// Both will be accepted.
// ============================================================
const createBulkApiRequests = async (req, res) => {
  try {
    const { cases } = req.body;

    // --------------------------------------------------------
    // Validate request
    // --------------------------------------------------------
    if (!Array.isArray(cases) || cases.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cases array is required",
      });
    }

    // --------------------------------------------------------
    // Maximum 100 cases per request
    // --------------------------------------------------------
    if (cases.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 cases allowed per request",
      });
    }

    const results = [];

    let created = 0;
    let failed = 0;

    // --------------------------------------------------------
    // Process every case individually
    // --------------------------------------------------------
    for (const item of cases) {
      try {
        // ----------------------------------------------------
        // Application ID required
        // ----------------------------------------------------
        if (!item.applicationId) {
          failed++;

          results.push({
            applicationId: "",
            status: "FAILED",
            reason: "Application ID is required",
          });

          continue;
        }

        // ----------------------------------------------------
        // Application ID validation
        // ----------------------------------------------------
        if (!isValidApplicationId(item.applicationId)) {
          failed++;

          results.push({
            applicationId: item.applicationId || "",
            status: "FAILED",
            reason:
              "Application ID can contain only letters, numbers, hyphens (-), and underscores (_)",
          });

          continue;
        }

        // ----------------------------------------------------
        // CREATE API REQUEST
        //
        // No duplicate applicationId check.
        // ----------------------------------------------------
        const request = await ApiRequest.create({
          applicationId: item.applicationId.trim(),

          candidateName: item.candidateName,

          fatherName: item.fatherName,

          dob: item.dob,

          address: item.address,

          city: item.city,

          state: item.state,

          pincode: item.pincode,

          tat: item.tat,

          remark: item.remark,

          attachment: item.attachment,

          // Vendor ONLY from API Key
          vendor: req.vendor,
        });

        // ----------------------------------------------------
        // API LOG
        // ----------------------------------------------------
        await createApiLog({
          appId: request.applicationId,

          endpoint: req.originalUrl,

          method: req.method,

          status: "SUCCESS",

          source: req.vendor,

          requestBody: item,

          responseBody: {
            message: "Bulk API Request Received",
          },
        });

        created++;

        results.push({
          applicationId: request.applicationId,

          status: "CREATED",
        });
      } catch (err) {
        failed++;

        console.error(
          "BULK API REQUEST ITEM ERROR:",
          err
        );

        results.push({
          applicationId: item.applicationId || "",

          status: "FAILED",

          reason: err.message,
        });
      }
    }

    // --------------------------------------------------------
    // FINAL RESPONSE
    // --------------------------------------------------------
    return res.status(201).json({
      success: true,

      summary: {
        received: cases.length,

        created,

        failed,
      },

      results,
    });
  } catch (error) {
    console.error(
      "CREATE BULK API REQUESTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================================
// PROCESS MULTIPLE API REQUESTS
//
// POST /api-inbox/process-bulk
//
// Body:
//
// {
//   "requestIds": [
//     "64abc...",
//     "64def...",
//     "64ghi..."
//   ]
// }
//
// Maximum 100 requests at once.
// ============================================================
const processBulkApiRequests = async (req, res) => {
  try {
    const { requestIds } = req.body;

    // --------------------------------------------------------
    // Validate requestIds
    // --------------------------------------------------------
    if (
      !Array.isArray(requestIds) ||
      requestIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "requestIds array is required",
      });
    }

    // --------------------------------------------------------
    // Maximum 100 requests
    // --------------------------------------------------------
    if (requestIds.length > 100) {
      return res.status(400).json({
        success: false,
        message:
          "Maximum 100 requests can be processed at once",
      });
    }

    // --------------------------------------------------------
    // Find admin user
    // --------------------------------------------------------
    const defaultUser = await User.findOne({
      role: "admin",
    });

    if (!defaultUser) {
      return res.status(404).json({
        success: false,
        message: "No admin user found",
      });
    }

    // --------------------------------------------------------
    // Fetch selected API requests
    // --------------------------------------------------------
    const requests = await ApiRequest.find({
      _id: { $in: requestIds },
    });

    // --------------------------------------------------------
    // Keep results in the same logical selection flow
    // --------------------------------------------------------
    const requestMap = new Map(
      requests.map((request) => [
        request._id.toString(),
        request,
      ])
    );

    const results = [];

    let processed = 0;
    let alreadyProcessed = 0;
    let notFound = 0;
    let failed = 0;

    // --------------------------------------------------------
    // Process each selected request
    // --------------------------------------------------------
    for (const requestId of requestIds) {
      try {
        const request = requestMap.get(
          requestId.toString()
        );

        // ----------------------------------------------------
        // Request not found
        // ----------------------------------------------------
        if (!request) {
          notFound++;

          results.push({
            requestId,
            applicationId: "",
            status: "NOT_FOUND",
            reason: "API request not found",
          });

          continue;
        }

        // ----------------------------------------------------
        // Already processed
        // ----------------------------------------------------
        if (request.processed) {
          alreadyProcessed++;

          results.push({
            requestId: request._id,
            applicationId: request.applicationId,
            status: "ALREADY_PROCESSED",
          });

          continue;
        }

        // ----------------------------------------------------
        // Create Case
        //
        // IMPORTANT:
        // We don't check comp_ref_no because duplicate
        // application IDs are allowed.
        // ----------------------------------------------------
        const newCase = await Case.create({
          comp_ref_no: request.applicationId,

          user: defaultUser._id,

          check_status: "NEW",

          callback_url: "",

          candidate_name: request.candidateName,

          father_name: request.fatherName,

          candidate_dob: parseClientDob(request.dob),

          // Candidate address
         address: request.address || "",

          city: request.city || "",

          state: request.state || "",

          pincode: request.pincode || "",

          vendor: request.vendor,

          tat: request.tat,

          remark: request.remark,

          attachment: request.attachment,
        });

        // ----------------------------------------------------
        // Mark request processed
        // ----------------------------------------------------
        request.processed = true;

        await request.save();

        // ----------------------------------------------------
        // API LOG
        // ----------------------------------------------------
        await createApiLog({
          appId: request.applicationId || "",

          endpoint: req.originalUrl,

          method: req.method,

          status: "PROCESSED",

          source: "Client API",

          requestBody: {
            apiRequestId: request._id,
          },

          responseBody: {
            caseId: newCase._id,

            message: "Case created successfully",
          },
        });

        processed++;

        results.push({
          requestId: request._id,

          applicationId: request.applicationId,

          caseId: newCase._id,

          status: "PROCESSED",
        });
      } catch (error) {
        failed++;

        console.error(
          "BULK PROCESS ITEM ERROR:",
          error
        );

        results.push({
          requestId,

          applicationId: requestMap.get(
            requestId?.toString()
          )?.applicationId || "",

          status: "FAILED",

          reason: error.message,
        });
      }
    }

    // --------------------------------------------------------
    // FINAL RESPONSE
    // --------------------------------------------------------
    return res.status(200).json({
      success: true,

      message:
        "Bulk processing completed",

      summary: {
        received: requestIds.length,

        processed,

        alreadyProcessed,

        notFound,

        failed,
      },

      results,
    });
  } catch (error) {
    console.error(
      "PROCESS BULK API REQUESTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================================
// RECENT API ACTIVITY
// ============================================================
const getRecentApiActivity = async (req, res) => {
  try {
    const logs = await ApiRequest.find()
      .sort({
        createdAt: -1,
      })
      .limit(5);

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error(
      "GET RECENT API ACTIVITY ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  getApiRequests,
  createApiRequest,
  processApiRequest,
  processBulkApiRequests,
  createBulkApiRequests,
  getRecentApiActivity,
};