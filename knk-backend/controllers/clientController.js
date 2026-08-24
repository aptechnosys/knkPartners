const Client = require("../models/Client");
const crypto = require("crypto");

// ============================================
// GET ALL CLIENTS
// ============================================

const getClients = async (req, res) => {
  try {
    const clients = await Client.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      clients,
    });
  } catch (error) {
    console.error("Get Clients Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// CREATE CLIENT
// ============================================

const createClient = async (req, res) => {
  try {
    const { vendorName, callbackUrl } = req.body;

    const existing = await Client.findOne({
      vendorName,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Vendor already exists",
      });
    }

    const prefix = vendorName
      .replace(/\s+/g, "_")
      .toUpperCase();

    const apiKey =
      prefix +
      "_" +
      crypto.randomBytes(12).toString("hex");

    const client = await Client.create({
      vendorName,
      callbackUrl,
      apiKey,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      client,
    });
  } catch (error) {
    console.error("Create Client Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// UPDATE CLIENT
// ============================================

const updateClient = async (req, res) => {
  try {
    const { callbackUrl } = req.body;

    // Callback URL is required
    if (callbackUrl === undefined) {
      return res.status(400).json({
        success: false,
        message: "Callback URL is required",
      });
    }

    // Find client
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Update callback URL only
    client.callbackUrl = callbackUrl.trim();

    await client.save();

    res.status(200).json({
      success: true,
      message: "Client updated successfully",
      client,
    });
  } catch (error) {
    console.error("Update Client Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// TOGGLE CLIENT STATUS
// ============================================

const toggleClientStatus = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    client.isActive = !client.isActive;

    await client.save();

    res.status(200).json({
      success: true,
      client,
    });
  } catch (error) {
    console.error("Toggle Client Status Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// REGENERATE CLIENT API KEY
// ============================================

const regenerateApiKey = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const prefix = client.vendorName
      .replace(/\s+/g, "_")
      .toUpperCase();

    const newApiKey =
      prefix +
      "_" +
      crypto.randomBytes(12).toString("hex");

    client.apiKey = newApiKey;

    await client.save();

    res.status(200).json({
      success: true,
      message: "API Key regenerated successfully",
      apiKey: newApiKey,
    });
  } catch (error) {
    console.error("Regenerate API Key Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  getClients,
  createClient,
  updateClient,
  toggleClientStatus,
  regenerateApiKey,
};