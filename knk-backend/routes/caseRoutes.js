const express = require("express");

const router = express.Router();

const validateCase = require("../middlewares/validateCase");
const validateStatus = require("../middlewares/validateStatus");
const validateBulkStatus = require("../middlewares/validateBulkStatus");
const uploadProof = require("../middlewares/uploadProof");
const uploadBulkFiles = require("../middlewares/uploadBulkFiles");

const {
  protect,
  adminOnly,
} = require("../middlewares/authMiddleware");

const {
  createCase,
  getAllCases,
  getSingleCase,
  updateCase,
  deleteCase,
  updateCaseStatus,
  assignCase,
  getDashboardStats,
  raiseInsufficientQuery,
  saveVerification,
  uploadProofDocument,
  archiveCase,
  getArchivedCases,
  restoreCase,
  bulkDeleteCases,
  bulkUpdateStatus,
  bulkUploadCases,
} = require("../controllers/caseController");


// DASHBOARD
router.get(
  "/cases/stats",
  protect,
  getDashboardStats
);


// CASE CRUD
router.post(
  "/cases",
  protect,
  validateCase,
  createCase
);

router.get(
  "/cases",
  protect,
  getAllCases
);

// GET ARCHIVED CASES
router.get(
  "/cases/archived",
  protect,
  adminOnly,
  getArchivedCases
);
// bulk case status update 
router.put(
  "/cases/bulk-status",
  protect,
  validateBulkStatus,
  bulkUpdateStatus
);

// SINGLE CASE
router.get(
  "/cases/:id",
  protect,
  getSingleCase
);

router.put(
  "/cases/:id",
  protect,
  validateCase,
  updateCase
);


// multiple Archive cases
router.delete(
  "/cases/bulk-delete",
  protect,
  adminOnly,
  bulkDeleteCases
);

router.delete(
  "/cases/:id",
  protect,
  deleteCase
);


// STATUS UPDATE
router.put(
  "/cases/:id/status",
  protect,
  validateStatus,
  updateCaseStatus
);

// bulk status update
// router.put(
//   "/cases/bulk-status",
//   protect,
//   validateStatus,
//   bulkUpdateStatus
// );

// ASSIGN CASE
router.patch(
  "/cases/:id/assign",
  protect,
  adminOnly,
  assignCase
);


// RAISE QUERY
router.patch(
  "/cases/:id/query",
  protect,
  raiseInsufficientQuery
);


// SAVE VERIFICATION
router.patch(
  "/cases/:id/verify",
  protect,
  saveVerification
);


// UPLOAD PROOF
router.patch(
  "/cases/:id/upload-proof",
  protect,
  uploadProof.single("proof"),
  uploadProofDocument
);

//bulk upload files 
router.post(
  "/cases/bulk-upload",
  protect,
  adminOnly,
  uploadBulkFiles,
  bulkUploadCases
);

// ARCHIVE CASE
router.patch(
  "/cases/:id/archive",
  protect,
  adminOnly,
  archiveCase
);


// RESTORE CASE
router.patch(
  "/cases/:id/restore",
  protect,
  adminOnly,
  restoreCase
);



// TEST ROUTE
router.get("/test", (req, res) => {
  res.send("Route working");
});

module.exports = router;