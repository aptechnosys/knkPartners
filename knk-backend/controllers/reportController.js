const Case = require("../models/Case");

// GET REPORT SUMMARY
const getReportSummary = async (req, res) => {
  try {
    // TOTAL CASES
    const totalCases = await Case.countDocuments();

    // NEW CASES
    const newCases = await Case.countDocuments({
      check_status: "NEW",
    });

    // IN PROGRESS / WIP CASES
    const inProgressCases = await Case.countDocuments({
      check_status: "IN_PROGRESS",
    });

    // COMPLETED CASES
    const completedCases = await Case.countDocuments({
      check_status: "COMPLETED",
    });

    // OVERDUE CASES
    // Only NEW and IN_PROGRESS cases can be overdue.
    const activeCases = await Case.find({
      check_status: {
        $in: ["NEW", "IN_PROGRESS"],
      },
    });

    const overdueCases = activeCases.filter((caseItem) => {
      // Case must have TAT
      if (!caseItem.tat) {
        return false;
      }

      const created = new Date(caseItem.createdAt);

      const deadline = new Date(
        created.getTime() +
          Number(caseItem.tat) * 24 * 60 * 60 * 1000
      );

      return deadline < new Date();
    }).length;

    res.status(200).json({
      success: true,
      data: {
        totalCases,
        newCases,
        inProgressCases,
        completedCases,
        overdueCases,
      },
    });
  } catch (error) {
    console.log(
      "REPORT SUMMARY ERROR =>",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getReportSummary,
};