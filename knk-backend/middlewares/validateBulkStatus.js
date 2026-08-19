module.exports = (req, res, next) => {
 

  const { comp_ref_nos, check_status } = req.body;

};
module.exports = (req, res, next) => {
  const { comp_ref_nos, check_status } = req.body;

  const validStatus = [
    "NEW",
    "IN_PROGRESS",
    "COMPLETED",
  ];

  if (!Array.isArray(comp_ref_nos) || comp_ref_nos.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please select at least one case.",
    });
  }

  if (comp_ref_nos.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Maximum 100 cases allowed.",
    });
  }

  const invalidRefs = comp_ref_nos.filter(
    (ref) => typeof ref !== "string" || ref.trim() === ""
  );

  if (invalidRefs.length) {
    return res.status(400).json({
      success: false,
      message: "Invalid comp_ref_no values.",
    });
  }

  if (!check_status) {
    return res.status(400).json({
      success: false,
      message: "Status is required.",
    });
  }

  if (!validStatus.includes(check_status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value.",
    });
  }

  next();
};