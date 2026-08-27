const Client = require("../models/Client");

const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "API Key missing",
      });
    }

    const client = await Client.findOne({
      apiKey,
    });

    if (!client) {
      return res.status(403).json({
        success: false,
        message: "Invalid API Key",
      });
    }

    if (!client.isActive) {
      return res.status(403).json({
        success: false,
        message: "Client disabled",
      });
    }

    req.client = client;
    req.vendor = client.vendorName;

    next();
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = apiKeyAuth;
