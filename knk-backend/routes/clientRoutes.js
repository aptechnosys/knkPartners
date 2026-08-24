const express = require("express");

const router = express.Router();

const {
  getClients,
  createClient,
  updateClient,
  toggleClientStatus,
  regenerateApiKey,
} = require("../controllers/clientController");

const {
  protect,
  adminOnly,
} = require("../middlewares/authMiddleware");

router.get(
  "/",
  protect,
  adminOnly,
  getClients
);

router.post(
  "/",
  protect,
  adminOnly,
  createClient
);

router.put(
  "/:id",
  protect,
  adminOnly,
  updateClient
);

router.patch(
  "/:id/toggle-status",
  protect,
  adminOnly,
  toggleClientStatus
);

router.patch(
  "/:id/regenerate-key",
  protect,
  adminOnly,
  regenerateApiKey
);

module.exports = router;