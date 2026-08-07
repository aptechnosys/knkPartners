module.exports = (req, res, next) => {

 

  const { comp_ref_no } = req.body;

  
}

module.exports = (req, res, next) => {

  const { comp_ref_no } = req.body;

  // 1) basic presence
  if (!comp_ref_no) {
    return res.status(400).json({
      success: false,
      message: "comp_ref_no is required",
    });
  }

  // 2) format
  if (!/^REF-\d+$/.test(comp_ref_no)) {
    return res.status(400).json({
      success: false,
      message: "Invalid format. Use REF-001",
    });
  }

  // 3) must call next
  return next();
};