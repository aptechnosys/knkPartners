const express = require("express");
const router = express.Router();

const {
  getAuditLogs,
} = require(
  "../controllers/auditLogController"
);

router.get(
  "/",
  getAuditLogs
);

module.exports = router;