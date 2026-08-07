const express = require("express");

const {
  getApiRequests,
  createApiRequest,
  createBulkApiRequests,
  processApiRequest,
  getRecentApiActivity,
} = require("../controllers/ApiInboxController");

const apiKeyAuth = require("../middlewares/apiKeyAuth");

const {
  clientLimiter,
} = require("../middlewares/rateLimiter");

const router = express.Router();

/* GET ALL */
router.get("/", getApiRequests);

/* RECENT API ACTIVITY */
router.get("/activity", getRecentApiActivity);

/* PROCESS REQUEST */
router.post("/process/:id", processApiRequest);


/* CLIENT API (Protected + Rate Limited) */
router.post(
  "/client",
  clientLimiter,
  apiKeyAuth,
  createApiRequest
);

/* CLIENT BULK API (Protected + Rate Limited) */
router.post(
  "/client/bulk",
  clientLimiter,
  apiKeyAuth,
  createBulkApiRequests
);

module.exports = router;