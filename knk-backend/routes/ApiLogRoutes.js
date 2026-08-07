const express =
  require("express");

const router =
  express.Router();

const {
  getApiLogs,
} = require(
  "../controllers/ApiLogController"
);

console.log(
  "ROUTE DEBUG:",
  getApiLogs
);

router.get(
  "/",
  getApiLogs
);

module.exports =
  router;