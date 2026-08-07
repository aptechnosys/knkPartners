const rateLimit = require("express-rate-limit");

/* LOGIN PROTECTION */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,

  standardHeaders: true,
 legacyHeaders: false,

  skipSuccessfulRequests: true,

  handler: (req, res) => {
    console.log(`Rate limited: ${req.ip}`);

    return res.status(429).json({
      success: false,
      message:
        "Too many failed login attempts. Please try again after 15 minutes.",
    });
  },
});

/* ADMIN DASHBOARD API*/
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 Minute
  max: 100,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many requests. Please slow down.",
  },
});

/* CLIENT API */
const clientLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 Minute
  max: 500,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Client API rate limit exceeded. Please try again later.",
  },
});

module.exports = {
  authLimiter,
  apiLimiter,
  clientLimiter,
};