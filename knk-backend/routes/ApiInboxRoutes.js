const express = require("express");

const {
  getApiRequests,
  createApiRequest,
  createBulkApiRequests,
  processApiRequest,
  processBulkApiRequests,
  getRecentApiActivity,
} = require("../controllers/ApiInboxController");

const apiKeyAuth = require("../middlewares/apiKeyAuth");

const {
  clientLimiter,
} = require("../middlewares/rateLimiter");

const router = express.Router();

// ============================================================
// GET ALL API REQUESTS
// ============================================================
router.get("/", getApiRequests);

// ============================================================
// RECENT API ACTIVITY
// ============================================================
router.get("/activity", getRecentApiActivity);

// ============================================================
// PROCESS SINGLE API REQUEST
// ============================================================
router.post(
  "/process/:id",
  processApiRequest
);

// ============================================================
// PROCESS MULTIPLE API REQUESTS
//
// Admin/frontend uses this endpoint.
// Example:
// POST /api/v1/api-inbox/process-bulk
//
// Body:
// {
//   "requestIds": ["id1", "id2", "id3"]
// }
// ============================================================
router.post(
  "/process-bulk",
  processBulkApiRequests
);

// ============================================================
// CLIENT API - SINGLE
// Protected + Rate Limited
// ============================================================
router.post(
  "/client",
  clientLimiter,
  apiKeyAuth,
  createApiRequest
);

// ============================================================
// CLIENT API - BULK
// Protected + Rate Limited
// ============================================================
router.post(
  "/client/bulk",
  clientLimiter,
  apiKeyAuth,
  createBulkApiRequests
);

module.exports = router;