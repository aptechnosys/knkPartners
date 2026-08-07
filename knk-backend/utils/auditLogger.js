const AuditLog = require("../models/AuditLog");

const createAuditLog = async ({
  userId,
  action,
  caseId,
  details,
  module,
}) => {

  

  try {

    const log =
      await AuditLog.create({
        userId,
        action,
        caseId,
        details,
        module,
      });

    

  }
  catch (err) {

    console.log(
      "AUDIT ERROR:",
      err.message
    );

  }

};

module.exports =
  createAuditLog;