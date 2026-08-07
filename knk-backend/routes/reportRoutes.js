const express = require("express");
const router = express.Router();

const {
  protect,
} = require(
  "../middlewares/authMiddleware"
);

const {
  getReportSummary,
} = require(
  "../controllers/reportController"
);

console.log(
  "REPORT DEBUG:",
  getReportSummary
);

// GET REPORT SUMMARY
router.get(
  "/summary",
  protect,
  getReportSummary
);

module.exports = router;