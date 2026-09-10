const express = require("express");

const router = express.Router();

// ============================================================
// MIDDLEWARES
// ============================================================

const validateCase = require("../middlewares/validateCase");
const validateStatus = require("../middlewares/validateStatus");
const validateBulkStatus = require("../middlewares/validateBulkStatus");
const validateObjectId = require("../middlewares/validateObjectId");

const uploadProof = require("../middlewares/uploadProof");
const uploadBulkFiles = require("../middlewares/uploadBulkFiles");

const {
  protect,
  adminOnly,
} = require("../middlewares/authMiddleware");

// ============================================================
// CONTROLLERS
// ============================================================

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
  bulkArchiveCases,
  getArchivedCases,
  restoreCase,
  bulkDeleteCases,
  bulkUpdateStatus,
  bulkUploadCases,
  viewProofDocument,
} = require("../controllers/caseController");

// ============================================================
// DASHBOARD
// ============================================================

router.get(
  "/cases/stats",
  protect,
  getDashboardStats
);

// ============================================================
// CASE CRUD
// ============================================================

// CREATE CASE
router.post(
  "/cases",
  protect,
  validateCase,
  createCase
);

// GET ALL CASES
router.get(
  "/cases",
  protect,
  getAllCases
);

// ============================================================
// ARCHIVED CASES
// ============================================================

// GET ARCHIVED CASES - ADMIN ONLY
router.get(
  "/cases/archived",
  protect,
  adminOnly,
  getArchivedCases
);

// ============================================================
// BULK STATUS UPDATE
// ============================================================

router.put(
  "/cases/bulk-status",
  protect,
  validateBulkStatus,
  bulkUpdateStatus
);

// ============================================================
// VIEW PROOF DOCUMENT
// ============================================================

router.get(
  "/cases/:id/proof",
  protect,
  validateObjectId,
  viewProofDocument
);

// ============================================================
// SINGLE CASE
// ============================================================

// GET SINGLE CASE
router.get(
  "/cases/:id",
  protect,
  validateObjectId,
  getSingleCase
);

// UPDATE CASE
router.put(
  "/cases/:id",
  protect,
  validateObjectId,
  validateCase,
  updateCase
);

// ============================================================
// DELETE CASE
// ============================================================

// BULK DELETE - ADMIN ONLY
router.delete(
  "/cases/bulk-delete",
  protect,
  adminOnly,
  bulkDeleteCases
);

// DELETE SINGLE CASE
router.delete(
  "/cases/:id",
  protect,
  validateObjectId,
  deleteCase
);

// ============================================================
// STATUS UPDATE
// ============================================================

router.put(
  "/cases/:id/status",
  protect,
  validateObjectId,
  validateStatus,
  updateCaseStatus
);

// ============================================================
// ASSIGN CASE - ADMIN ONLY
// ============================================================

router.patch(
  "/cases/:id/assign",
  protect,
  adminOnly,
  validateObjectId,
  assignCase
);

// ============================================================
// RAISE INSUFFICIENT QUERY
// ============================================================

router.patch(
  "/cases/:id/query",
  protect,
  validateObjectId,
  raiseInsufficientQuery
);

// ============================================================
// SAVE VERIFICATION
// ============================================================

router.patch(
  "/cases/:id/verify",
  protect,
  validateObjectId,
  saveVerification
);

// ============================================================
// UPLOAD PROOF
// ============================================================

router.patch(
  "/cases/:id/upload-proof",
  protect,
  validateObjectId,
  uploadProof.single("proof"),
  uploadProofDocument
);

// ============================================================
// BULK UPLOAD - ADMIN ONLY
// ============================================================

router.post(
  "/cases/bulk-upload",
  protect,
  adminOnly,
  uploadBulkFiles,
  bulkUploadCases
);

// ============================================================
// ARCHIVE CASE - ADMIN ONLY
// ============================================================

router.patch(
  "/cases/:id/archive",
  protect,
  adminOnly,
  validateObjectId,
  archiveCase
);

// ============================================================
// BULK ARCHIVE - ADMIN ONLY
// ============================================================

router.patch(
  "/cases/bulk-archive",
  protect,
  adminOnly,
  bulkArchiveCases
);

// ============================================================
// RESTORE CASE - ADMIN ONLY
// ============================================================

router.patch(
  "/cases/:id/restore",
  protect,
  adminOnly,
  validateObjectId,
  restoreCase
);

// ============================================================
// TEST ROUTE
// ============================================================

// Keep test route available only outside production
if (process.env.NODE_ENV !== "production") {
  router.get("/test", (req, res) => {
    res.json({
      success: true,
      message: "Route working",
    });
  });
}

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;