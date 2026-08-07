const ApiRequest = require("../models/ApiRequest");
const Case = require("../models/Case");
const User = require("../models/User");
const createApiLog = require("../utils/ApiLogger");


// GET ALL API REQUESTS
const getApiRequests = async (req, res) => {
  try {

    const requests =
      await ApiRequest.find({
        processed: false,
      }).sort({ createdAt: -1 });

    res.json(requests);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};


// CREATE NEW API REQUEST
const createApiRequest = async (req, res) => {
  try {
    const {
      applicationId,
      candidateName,
      fatherName,
      dob,
      city,
      state,
      tat,
      remark,
      attachment,
    } = req.body;

    // Basic validation
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    // Prevent duplicate application IDs
    const existingRequest = await ApiRequest.findOne({
      applicationId,
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "Application ID already exists",
      });
    }

    // Vendor comes ONLY from API key middleware
    const request = await ApiRequest.create({
      applicationId,
      candidateName,
      fatherName,
      dob,
      city,
      state,
      tat,
      remark,
      attachment,

      // SECURITY:
      // Ignore vendor from request body
      vendor: req.vendor,
    });

    // API LOG CREATE
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
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// PROCESS API REQUEST -> CREATE REAL CASE
const processApiRequest = async (
  req,
  res
) => {
  try {

    const request =
      await ApiRequest.findById(
        req.params.id
      );

    if (!request) {
      return res.status(404).json({
        message:
          "API request not found",
      });
    }

    // prevent duplicate processing
    if (request.processed) {
      return res.status(400).json({
        message:
          "Already processed",
      });
    }

    // find default admin user
    const defaultUser =
      await User.findOne({
        role: "admin",
      });

    if (!defaultUser) {
      return res.status(404).json({
        message:
          "No admin user found",
      });
    }

    // use applicationId from API as real ref no
    const comp_ref_no =
      request.applicationId;

    // prevent duplicate case ref
    const existingCase =
      await Case.findOne({
        comp_ref_no,
      });

    if (existingCase) {
      return res.status(400).json({
        message:
          "Case already exists",
      });
    }

    // CREATE REAL CASE
    const newCase =
      await Case.create({
        comp_ref_no,

        user:
          defaultUser._id,

        check_status:
          "NEW",

        callback_url: "",

        candidate_name:
          request.candidateName,

        father_name:
          request.fatherName,

        candidate_dob:
          request.dob,

        city:
          request.city,

        state:
          request.state,

        vendor:
          request.vendor,

        tat:
          request.tat,

        remark:
          request.remark,

        attachment:
          request.attachment,
      });

    // mark request processed
    request.processed = true;
    await request.save();

    // API LOG FOR PROCESSING
    await createApiLog({
      appId:
        request.applicationId ||
        "",

      endpoint:
        req.originalUrl,

      method:
        req.method,

      status:
        "PROCESSED",

      source:
        "Client API",

      requestBody: {
        apiRequestId:
          request._id,
      },

      responseBody: {
        caseId:
          newCase._id,
        message:
          "Case created successfully",
      },
    });

    res.json({
      success: true,
      message:
        "Case created successfully",
      case: newCase,
    });

  } catch (error) {

    res.status(500).json({
      message:
        error.message,
    });

  }
};

// BULK CLIENT API REQUESTS
const createBulkApiRequests = async (req, res) => {
  try {
    const { cases } = req.body;

    // Validate request
    if (!Array.isArray(cases) || cases.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cases array is required",
      });
    }

    // Maximum limit
    if (cases.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 cases allowed per request",
      });
    }

    const results = [];

    let created = 0;
    let duplicates = 0;
    let failed = 0;

    for (const item of cases) {
      try {
        if (!item.applicationId) {
          failed++;

          results.push({
            applicationId: "",
            status: "FAILED",
            reason: "Application ID is required",
          });

          continue;
        }

        // Duplicate Check
        const existing = await ApiRequest.findOne({
          applicationId: item.applicationId,
        });

        if (existing) {
          duplicates++;

          results.push({
            applicationId: item.applicationId,
            status: "DUPLICATE",
          });

          continue;
        }

        // Create Request
        const request = await ApiRequest.create({
          applicationId: item.applicationId,
          candidateName: item.candidateName,
          fatherName: item.fatherName,
          dob: item.dob,
          city: item.city,
          state: item.state,
          tat: item.tat,
          remark: item.remark,
          attachment: item.attachment,

          // Vendor ONLY from API Key
          vendor: req.vendor,
        });

        // Create API Log
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

        results.push({
          applicationId: item.applicationId || "",
          status: "FAILED",
          reason: err.message,
        });
      }
    }

    return res.status(201).json({
      success: true,

      summary: {
        received: cases.length,
        created,
        duplicates,
        failed,
      },

      results,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// RECENT API ACTIVITY
const getRecentApiActivity =
  async (req, res) => {
    try {

      const logs =
        await ApiRequest.find()
          .sort({
            createdAt: -1,
          })
          .limit(5);

      res.status(200).json({
        success: true,
        data: logs,
      });

    } catch (error) {

      res.status(500).json({
        message:
          error.message,
      });

    }
  };


module.exports = {
  getApiRequests,
  createApiRequest,
  processApiRequest,
  createBulkApiRequests,
  getRecentApiActivity,
};