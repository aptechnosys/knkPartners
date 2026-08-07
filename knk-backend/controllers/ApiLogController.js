const ApiLog =
  require("../models/ApiLog");

const getApiLogs =
  async (req, res) => {
    try {

      const logs =
        await ApiLog.find()
          .sort({
            createdAt: -1,
          });

      res.status(200).json({
        success: true,
        data: logs,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message:
          error.message,
      });

    }
  };

module.exports = {
  getApiLogs,
};