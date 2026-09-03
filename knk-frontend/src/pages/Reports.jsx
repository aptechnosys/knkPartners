import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import API from "../api/axios";
import LoadingSpinner from "../components/LoadingSpinner";

import {
  MdFolder,
  MdInbox,
  MdSync,
  MdCheckCircle,
  MdWarning,
  MdDownload,
} from "react-icons/md";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


// ============================================================
// REPORT CARD
// ============================================================

function ReportCard({
  title,
  value,
  icon: Icon,
  iconBg,
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center justify-between shadow-sm">
      <div>
        <p className="text-xs text-slate-500 uppercase font-medium">
          {title}
        </p>

        <h2 className="text-3xl font-bold text-slate-900 mt-2">
          {value}
        </h2>
      </div>

      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}
      >
        <Icon className="text-2xl" />
      </div>
    </div>
  );
}


// ============================================================
// REPORTS
// ============================================================

export default function Reports() {
  const [stats, setStats] = useState(null);

  const [loading, setLoading] =
    useState(true);


  // ==========================================================
  // FETCH REPORT DATA
  // ==========================================================

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await API.get(
          "/reports/summary"
        );

        setStats(
          res.data.data
        );

      } catch (err) {
        console.error(
          "Failed to fetch reports:",
          err
        );

      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);


  // ==========================================================
  // EXPORT EXCEL
  // ==========================================================

  const handleExportExcel = async () => {
    try {

      // --------------------------------------------------------
      // Get cases
      // --------------------------------------------------------

      const res = await API.get(
        "/cases?page=1&limit=1000"
      );

      const cases =
        res.data.data || [];


      if (!cases.length) {
        alert(
          "No cases available for export."
        );
        return;
      }


      // --------------------------------------------------------
      // Create export data
      // --------------------------------------------------------

      const exportData =
        cases.map((item) => {

          const tatDays =
            Number(item.tat);


          let tatStatus =
            "-";


          // ====================================================
          // CALCULATE TAT STATUS
          // ====================================================

          if (
            item.createdAt &&
            tatDays > 0
          ) {

            const deadline =
              new Date(
                item.createdAt
              ).getTime() +
              tatDays *
                24 *
                60 *
                60 *
                1000;


            // --------------------------------------------------
            // COMPLETED CASE
            // --------------------------------------------------

            if (
              String(
                item.check_status || ""
              ).toUpperCase() ===
              "COMPLETED"
            ) {

              tatStatus =
                "Completed";

            }

            // --------------------------------------------------
            // OVERDUE CASE
            // --------------------------------------------------

            else if (
              Date.now() >
              deadline
            ) {

              const overdueDays =
                Math.ceil(
                  (
                    Date.now() -
                    deadline
                  ) /
                    (
                      24 *
                      60 *
                      60 *
                      1000
                    )
                );


              tatStatus =
                `Overdue by ${overdueDays} day${
                  overdueDays !== 1
                    ? "s"
                    : ""
                }`;

            }

            // --------------------------------------------------
            // CASE STILL WITHIN TAT
            // --------------------------------------------------

            else {

              const daysLeft =
                Math.ceil(
                  (
                    deadline -
                    Date.now()
                  ) /
                    (
                      24 *
                      60 *
                      60 *
                      1000
                    )
                );


              tatStatus =
                `${daysLeft} day${
                  daysLeft !== 1
                    ? "s"
                    : ""
                } left`;
            }
          }


          // ====================================================
          // RETURN EXCEL ROW
          // ====================================================

          return {

            "Reference No":
              item.comp_ref_no ||
              "-",


            Candidate:
              item.candidate_name ||
              "-",


            "Father Name":
              item.father_name ||
              "-",


            DOB:
              item.candidate_dob
                ? new Date(
                    item.candidate_dob
                  ).toLocaleDateString(
                    "en-GB"
                  )
                : "-",


            Address:
              item.address ||
              "-",


            City:
              item.city ||
              "-",


            State:
              item.state ||
              "-",


            "Pin Code":
              item.pincode ||
              "-",


            Vendor:
              item.vendor ||
              "-",


            Status:
              item.check_status ||
              "-",


            "Assigned To":
              item.assignedTo?.email ||
              "Unassigned",


            TAT:
              item.tat ||
              "-",


            "TAT Status":
              tatStatus,


            "Verification Result":
              item.verification_result ||
              "-",


            "Verification Remark":
              item.verification_remark ||
              "-",


            "Verified Date":
              item.verified_date
                ? new Date(
                    item.verified_date
                  ).toLocaleString()
                : "-",


            Remark:
              item.remark ||
              "-",


            "Created At":
              item.createdAt
                ? new Date(
                    item.createdAt
                  ).toLocaleString()
                : "-",
          };
        });


      // ========================================================
      // CREATE WORKSHEET
      // ========================================================

      const worksheet =
        XLSX.utils.json_to_sheet(
          exportData
        );


      // ========================================================
      // COLUMN WIDTHS
      // ========================================================

      const colWidths =
        Object.keys(
          exportData[0]
        ).map((key) => ({

          wch:
            Math.max(
              key.length,

              ...exportData.map(
                (row) =>
                  String(
                    row[key] || ""
                  ).length
              )
            ) + 5,

        }));


      worksheet["!cols"] =
        colWidths;


      // ========================================================
      // CREATE WORKBOOK
      // ========================================================

      const workbook =
        XLSX.utils.book_new();


      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Cases Report"
      );


      // ========================================================
      // WRITE EXCEL
      // ========================================================

      const excelBuffer =
        XLSX.write(
          workbook,
          {
            bookType: "xlsx",
            type: "array",
          }
        );


      // ========================================================
      // CREATE FILE
      // ========================================================

      const fileData =
        new Blob(
          [excelBuffer],
          {
            type:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
          }
        );


      // ========================================================
      // DOWNLOAD
      // ========================================================

      saveAs(
        fileData,
        `KNK_Report_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`
      );

    } catch (err) {

      console.error(
        "Excel export error:",
        err
      );

      alert(
        err.response?.data?.message ||
        "Failed to export report."
      );
    }
  };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <DashboardLayout
        title="Reports"
        breadcrumbs={[
          "Home",
          "Reports",
        ]}
      >
        <LoadingSpinner />
      </DashboardLayout>
    );
  }


  // ==========================================================
  // CHART DATA
  //
  // IMPORTANT:
  // Overdue is NOT included here because it is not a
  // separate status. An overdue case can still be NEW
  // or IN PROGRESS.
  // ==========================================================

  const chartData = [

    {
      name: "New",

      value:
        Number(
          stats?.newCases
        ) || 0,
    },


    {
      name: "In Progress",

      value:
        Number(
          stats?.inProgressCases
        ) || 0,
    },


    {
      name: "Completed",

      value:
        Number(
          stats?.completedCases
        ) || 0,
    },

  ];


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <DashboardLayout
      title="Reports"
      breadcrumbs={[
        "Home",
        "Reports",
      ]}
    >

      {/* =====================================================
          REPORT CARDS
      ====================================================== */}

      <div
        className="
          grid
          grid-cols-2
          lg:grid-cols-3
          gap-4
        "
      >

        {/* TOTAL */}

        <ReportCard
          title="Total Cases"
          value={
            stats?.totalCases ||
            0
          }
          icon={MdFolder}
          iconBg="bg-blue-50 text-blue-600"
        />


        {/* NEW */}

        <ReportCard
          title="New Cases"
          value={
            stats?.newCases ||
            0
          }
          icon={MdInbox}
          iconBg="bg-slate-100 text-slate-600"
        />


        {/* IN PROGRESS */}

        <ReportCard
          title="In Progress"
          value={
            stats?.inProgressCases ||
            0
          }
          icon={MdSync}
          iconBg="bg-indigo-50 text-indigo-600"
        />


        {/* COMPLETED */}

        <ReportCard
          title="Completed"
          value={
            stats?.completedCases ||
            0
          }
          icon={MdCheckCircle}
          iconBg="bg-green-50 text-green-600"
        />


        {/* OVERDUE */}

        <ReportCard
          title="Overdue"
          value={
            stats?.overdueCases ||
            0
          }
          icon={MdWarning}
          iconBg="bg-red-50 text-red-600"
        />

      </div>


      {/* =====================================================
          EXPORT BUTTON
      ====================================================== */}

      <div
        className="
          mt-6
          flex
          justify-end
        "
      >

        <button
          onClick={
            handleExportExcel
          }
          className="
            flex
            items-center
            gap-2
            bg-green-600
            hover:bg-green-700
            text-white
            px-4
            py-2
            rounded-lg
            shadow-sm
            transition
          "
        >

          <MdDownload />

          Export Excel

        </button>

      </div>


      {/* =====================================================
          CASE DISTRIBUTION
      ====================================================== */}

      <div
        className="
          mt-6
          bg-white
          rounded-xl
          border
          border-slate-100
          p-6
          shadow-sm
        "
      >

        <h2
          className="
            text-lg
            font-semibold
            text-slate-800
            mb-6
          "
        >
          Case Distribution
        </h2>


        <div
          className="
            overflow-x-auto
            flex
            justify-center
          "
        >

          <BarChart
            width={850}
            height={350}
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >

            <CartesianGrid
              strokeDasharray="3 3"
            />


            <XAxis
              dataKey="name"
            />


            <YAxis />


            <Tooltip />


            <Bar
              dataKey="value"
              fill="#3B82F6"
              radius={[
                8,
                8,
                0,
                0,
              ]}
            />

          </BarChart>

        </div>

      </div>

    </DashboardLayout>
  );
}