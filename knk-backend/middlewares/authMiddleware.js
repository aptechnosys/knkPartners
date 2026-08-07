const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 🔐 Protect Route
const protect = async (req, res, next) => {

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        const error = new Error("User not found");
        error.statusCode = 401;
        return next(error);
      }

      req.user = user;

      return next(); // ✅ MUST RETURN

    } catch (error) {
      error.statusCode = 401;
      error.message = "Not authorized, token failed";
      return next(error); // ✅ MUST RETURN
    }
  }

  // FIX: always return here
  const error = new Error("Not authorized, no token");
  error.statusCode = 401;
  return next(error);
};


// 👑 Admin Only
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next(); // ✅ return
  }

  const error = new Error("Admin access only");
  error.statusCode = 403;
  return next(error); //  FIX: return added
};

module.exports = { protect, adminOnly };