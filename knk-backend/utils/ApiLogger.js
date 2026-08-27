// Whenever client API / callback / inbox request will hit ... it will automatically save Logs in MongoDB

const ApiLog =
  require("../models/ApiLog");

const createApiLog =
  async ({
    appId = "",
    endpoint = "",
    method = "POST",
    status = "SUCCESS",
    source = "Client API",
    requestBody = {},
    responseBody = {},
  }) => {

    try {

      

      const log =
        await ApiLog.create({
          appId,
          endpoint,
          method,
          status,
          source,
          requestBody,
          responseBody,
        });

     

      return log;

    }
    catch (error) {

      console.log(
        "API LOG ERROR:",
        error.message
      );

    }
  };

module.exports =
  createApiLog;