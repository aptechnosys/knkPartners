module.exports = (req, res, next) => {
  const { check_status } = req.body;

      const validStatus = [
        "NEW",
        "IN_PROGRESS",
        "COMPLETED",
      ];

  if (!check_status) {
    const error = new Error("Status is required");
    error.statusCode = 400;
    return next(error);
  }

  if (!validStatus.includes(check_status)) {

    const error = new Error("Invalid status value");
    error.statusCode = 400;
    return next(error);
  }

  next();
};