const express = require("express");
const router = express.Router();

const {
  getCaseStatus,
  getBulkCaseStatus,
  getVendorCasesStatus,
  downloadProofDocument,
} = require("../controllers/clientApiController");

const apiKeyAuth = require("../middlewares/apiKeyAuth");

const {
  clientLimiter,
} = require("../middlewares/rateLimiter");

/* Bulk Status */
router.post(
  "/status/bulk",
  clientLimiter,
  apiKeyAuth,
  getBulkCaseStatus
);

/* Vendor All Cases */
router.get(
  "/status/vendor",
  clientLimiter,
  apiKeyAuth,
  getVendorCasesStatus
);
/* Proof Document Download */
router.get(
  "/proof/:applicationId",
  clientLimiter,
  apiKeyAuth,
  downloadProofDocument
);

/* Single Case Status */
router.get(
  "/status/:applicationId",
  clientLimiter,
  apiKeyAuth,
  getCaseStatus
);

module.exports = router;