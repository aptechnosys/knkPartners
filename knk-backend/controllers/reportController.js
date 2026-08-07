const Case = require("../models/Case");

// GET REPORT SUMMARY
const getReportSummary = async (req, res) => {
  try {
    const totalCases =
      await Case.countDocuments();

    const newCases =
      await Case.countDocuments({
        check_status: "NEW",
      });

    const inProgressCases =
      await Case.countDocuments({
        check_status: "IN_PROGRESS",
      });

    const qCheckCases =
      await Case.countDocuments({
        check_status: "Q_CHECK",
      });

    const doneCases =
      await Case.countDocuments({
        check_status: "DONE",
      });

    const insufficientCases =
      await Case.countDocuments({
        check_status: "INSUFFICIENT",
      });

    const onHoldCases =
      await Case.countDocuments({
        check_status: "ON_HOLD",
      });

    const stoppedCases =
      await Case.countDocuments({
        check_status: "STOPPED",
      });

    const rejectedCases =
      await Case.countDocuments({
        check_status: "REJECTED",
      });

    // OVERDUE CASES
    const allCases = await Case.find({
      check_status: {
        $nin: [
          "DONE",
          "REJECTED",
          "STOPPED",
        ],
      },
    });

    const overdueCases = allCases.filter(
      (c) => {
        if (!c.tat) return false;

        const created = new Date(
          c.createdAt
        );

        const deadline = new Date(
          created.getTime() +
            c.tat * 24 * 60 * 60 * 1000
        );

        return deadline < new Date();
      }
    ).length;

    res.status(200).json({
      success: true,
      data: {
        totalCases,
        newCases,
        inProgressCases,
        qCheckCases,
        doneCases,
        insufficientCases,
        onHoldCases,
        stoppedCases,
        rejectedCases,
        overdueCases,
      },
    });
  } catch (error) {
    console.log(
      "REPORT SUMMARY ERROR =>",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getReportSummary,
};