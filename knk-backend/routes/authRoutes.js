const express = require("express");
const router = express.Router();
const {
  authLimiter,
} = require("../middlewares/rateLimiter");

const { registerUser, loginUser, getAllUsers, getProfile,
  changePassword, updateProfile, uploadAvatar, } = require("../controllers/authController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const uploadAvatarMiddleware = require("../middlewares/uploadAvatar");




router.post("/register", registerUser);
// rate limiter
router.post( "/login",authLimiter,loginUser);
router.get("/users", protect, adminOnly, getAllUsers);
router.get(
  "/profile",
  protect,
  getProfile
);

router.patch(
  "/change-password",
  protect,
  changePassword
);


router.put(
  "/profile",
  protect,
  updateProfile
);

router.patch(
  "/avatar",
  protect,
  uploadAvatarMiddleware.single("avatar"),
  uploadAvatar
);

module.exports = router;