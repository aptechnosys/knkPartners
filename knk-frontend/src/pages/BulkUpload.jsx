import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { bulkUploadCases } from "../services/caseService";

import {
  MdUploadFile,
  MdDescription,
  MdFolderZip,
  MdCheckCircle,
  MdError,
  MdRefresh,
  MdDownload,
} from "react-icons/md";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function BulkUpload() {
  const [excelFile, setExcelFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState(null);

  const [errors, setErrors] = useState([]);

  // ============================================================
  // EXCEL FILE
  // ============================================================

  const handleExcel = (e) => {
    setExcelFile(e.target.files[0] || null);
  };

  // ============================================================
  // ZIP FILE
  // ============================================================

  const handleZip = (e) => {
    setZipFile(e.target.files[0] || null);
  };

  // ============================================================
  // RESET
  // ============================================================

  const resetForm = () => {
    setExcelFile(null);
    setZipFile(null);
    setErrors([]);
    setResult(null);

    const excelInput = document.getElementById("excelInput");
    const zipInput = document.getElementById("zipInput");

    if (excelInput) {
      excelInput.value = "";
    }

    if (zipInput) {
      zipInput.value = "";
    }
  };

  // ============================================================
  // UPLOAD
  // ============================================================

  const handleUpload = async () => {
    if (!excelFile) {
      alert("Please select Excel file.");
      return;
    }

    if (!zipFile) {
      alert("Please select ZIP file.");
      return;
    }

    try {
      setLoading(true);
      setErrors([]);
      setResult(null);

      const res = await bulkUploadCases(
        excelFile,
        zipFile
      );

      /*
       * caseService may return either:
       *
       * response.data
       *
       * or directly the response object.
       *
       * Handle both safely.
       */
      const uploadResult =
        res?.data?.summary ||
        res?.data ||
        res;

      setResult(uploadResult);

      if (uploadResult?.errors) {
        setErrors(
          Array.isArray(uploadResult.errors)
            ? uploadResult.errors
            : []
        );
      }
    } catch (err) {
      console.error("Bulk upload error:", err);

      /*
       * IMPORTANT:
       * Never put an object directly inside JSX.
       *
       * Backend may return:
       *
       * {
       *   row,
       *   applicationId,
       *   type,
       *   reason,
       *   fileName
       * }
       *
       * OR a normal message string.
       */

      const backendErrors =
        err.response?.data?.errors;

      if (Array.isArray(backendErrors)) {
        setErrors(backendErrors);

        /*
         * If backend returned partial result together
         * with errors, preserve it.
         */
        if (err.response?.data) {
          setResult(err.response.data);
        }
      } else {
        const message =
          err.response?.data?.message ||
          err.message ||
          "Upload failed";

        setErrors([
          {
            row: "-",
            applicationId: "-",
            type: "UPLOAD_ERROR",
            reason: message,
            fileName: "-",
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FORMAT ERROR TYPE
  // ============================================================

  const getErrorTypeLabel = (type) => {
    switch (type) {
      case "MISSING_PROOF":
        return "Missing Proof";

      case "INVALID_STATUS":
        return "Invalid Status";

      case "VENDOR_MISMATCH":
        return "Vendor Mismatch";

      case "CASE_NOT_FOUND":
        return "Case Not Found";

      case "ALREADY_COMPLETED":
        return "Already Completed";

      case "PROCESSING_ERROR":
        return "Processing Error";

      case "UPLOAD_ERROR":
        return "Upload Error";

      default:
        return type || "-";
    }
  };

  // ============================================================
  // DOWNLOAD FAILED ROWS
  // ============================================================

  const downloadFailedRows = () => {
    if (!errors.length) {
      alert("No failed rows available.");
      return;
    }

    const failedRows = errors.map((error, index) => {
      /*
       * Handle both object and string errors.
       */

      if (typeof error === "string") {
        return {
          "Row": index + 1,
          "Application ID": "-",
          "Error Type": "UPLOAD_ERROR",
          "Reason": error,
          "File Name": "-",
        };
      }

      return {
        "Row":
          error.row ??
          index + 1,

        "Application ID":
          error.applicationId ||
          "-",

        "Error Type":
          getErrorTypeLabel(error.type),

        "Reason":
          error.reason ||
          "-",

        "File Name":
          error.fileName ||
          "-",
      };
    });

    const worksheet =
      XLSX.utils.json_to_sheet(failedRows);

    // Auto-size columns
    worksheet["!cols"] =
      Object.keys(failedRows[0]).map(
        (key) => ({
          wch:
            Math.max(
              key.length,
              ...failedRows.map((row) =>
                String(
                  row[key] || ""
                ).length
              )
            ) + 5,
        })
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Failed Rows"
    );

    const excelBuffer =
      XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

    saveAs(
      new Blob(
        [excelBuffer],
        {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
      ),
      `KNK_Bulk_Upload_Failed_Rows_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <DashboardLayout
      title="Bulk Upload"
      breadcrumbs={[
        "Home",
        "Bulk Upload",
      ]}
    >
      <div className="max-w-5xl mx-auto">

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

          {/* =====================================================
              HEADER
          ====================================================== */}

          <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">

            <h1 className="text-xl font-bold text-slate-800">
              Bulk Upload
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Export selected rows first,
              fill Verification Date,
              Colour Code,
              Verify Status and File Name,
              then upload the Excel
              together with ZIP proof files.
            </p>

          </div>

          <div className="p-6 space-y-8">

            {/* =================================================
                EXCEL
            ================================================== */}

            <div className="space-y-3">

              <h2 className="font-semibold text-slate-800 flex items-center gap-2">

                <MdDescription />

                File Upload (Excel)

                <span className="text-red-500">
                  *
                </span>

              </h2>

              <input
                id="excelInput"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcel}
                className="block w-full border rounded-lg p-3"
              />

              <p className="text-sm text-slate-500">

                In Excel keep only
                <b> Completed </b>
                or
                <b> Stop Check </b>
                rows.

              </p>

              <p className="text-sm text-slate-500">

                Maximum
                <b> 100 records </b>
                allowed.

              </p>

            </div>

            {/* =================================================
                ZIP
            ================================================== */}

            <div className="space-y-3">

              <h2 className="font-semibold text-slate-800 flex items-center gap-2">

                <MdFolderZip />

                Annexure ZIP

                <span className="text-red-500">
                  *
                </span>

              </h2>

              <input
                id="zipInput"
                type="file"
                accept=".zip"
                onChange={handleZip}
                className="block w-full border rounded-lg p-3"
              />

              <p className="text-sm text-slate-500">

                ZIP filenames must exactly
                match the values entered
                in the Excel
                <b> File Name </b>
                column.

              </p>

              <p className="text-sm text-slate-500">

                Example

                <br />

                Excel :
                <b> REF-001.pdf </b>

                <br />

                ZIP :
                <b> REF-001.pdf </b>

              </p>

            </div>

            {/* =================================================
                BUTTONS
            ================================================== */}

            <div className="flex gap-3">

              <button
                onClick={handleUpload}
                disabled={loading}
                className="
                  bg-orange-500
                  hover:bg-orange-600
                  disabled:opacity-60
                  text-white
                  px-6
                  py-3
                  rounded-lg
                  font-semibold
                  transition
                  flex
                  items-center
                  gap-2
                "
              >

                <MdUploadFile />

                {loading
                  ? "Uploading..."
                  : "Upload"}

              </button>

              <button
                onClick={resetForm}
                disabled={loading}
                className="
                  border
                  px-6
                  py-3
                  rounded-lg
                  flex
                  items-center
                  gap-2
                  hover:bg-slate-50
                "
              >

                <MdRefresh />

                Reset

              </button>

            </div>

            {/* =================================================
                RESULT
            ================================================== */}

            {result && (

              <div className="space-y-6">

                {/* =================================================
                    SUMMARY
                ================================================== */}

                <div className="border rounded-xl bg-green-50 border-green-200 p-5">

                  <div className="flex items-center gap-2 mb-4">

                    <MdCheckCircle
                      className="
                        text-green-600
                        text-2xl
                      "
                    />

                    <h2 className="font-bold text-green-700">

                      Bulk Upload Completed

                    </h2>

                  </div>

                  <div className="
                    grid
                    grid-cols-2
                    md:grid-cols-4
                    gap-4
                  ">

                    {/* TOTAL */}

                    <div className="bg-white rounded-lg p-4 border">

                      <p className="
                        text-xs
                        text-slate-500
                        uppercase
                      ">
                        Total Rows
                      </p>

                      <p className="
                        text-2xl
                        font-bold
                        mt-2
                      ">
                        {result.summary?.totalRows ??
                          result.totalRows ??
                          0}
                      </p>

                    </div>

                    {/* MATCHED */}

                    <div className="bg-white rounded-lg p-4 border">

                      <p className="
                        text-xs
                        text-slate-500
                        uppercase
                      ">
                        Matched
                      </p>

                      <p className="
                        text-2xl
                        font-bold
                        mt-2
                        text-blue-600
                      ">
                        {result.summary?.matched ??
                          result.matched ??
                          0}
                      </p>

                    </div>

                    {/* UPDATED */}

                    <div className="bg-white rounded-lg p-4 border">

                      <p className="
                        text-xs
                        text-slate-500
                        uppercase
                      ">
                        Updated
                      </p>

                      <p className="
                        text-2xl
                        font-bold
                        mt-2
                        text-green-600
                      ">
                        {result.summary?.updated ??
                          result.updated ??
                          0}
                      </p>

                    </div>

                    {/* FAILED */}

                    <div className="bg-white rounded-lg p-4 border">

                      <p className="
                        text-xs
                        text-slate-500
                        uppercase
                      ">
                        Failed
                      </p>

                      <p className="
                        text-2xl
                        font-bold
                        mt-2
                        text-red-600
                      ">
                        {result.summary?.failed ??
                          result.failed ??
                          errors.length}
                      </p>

                    </div>

                  </div>

                </div>

                {/* =================================================
                    UPDATED CASES
                ================================================== */}

                {result.updatedCases?.length > 0 && (

                  <div className="
                    border
                    rounded-xl
                    overflow-hidden
                  ">

                    <div className="
                      bg-slate-50
                      px-5
                      py-3
                      border-b
                    ">

                      <h2 className="font-semibold">
                        Updated Cases
                      </h2>

                    </div>

                    <div className="overflow-x-auto">

                      <table className="w-full">

                        <thead className="bg-slate-100">

                          <tr>

                            <th className="text-left px-4 py-3">
                              Reference No
                            </th>

                            <th className="text-left px-4 py-3">
                              Status
                            </th>

                            <th className="text-left px-4 py-3">
                              Colour
                            </th>

                            <th className="text-left px-4 py-3">
                              Proof
                            </th>

                          </tr>

                        </thead>

                        <tbody>

                          {result.updatedCases.map(
                            (item, index) => (

                              <tr
                                key={index}
                                className="border-t"
                              >

                                <td className="px-4 py-3">
                                  {item.referenceNo || "-"}
                                </td>

                                <td className="px-4 py-3">

                                  <span className="
                                    bg-green-100
                                    text-green-700
                                    px-3
                                    py-1
                                    rounded-full
                                    text-sm
                                  ">

                                    {item.status || "-"}

                                  </span>

                                </td>

                                <td className="px-4 py-3">
                                  {item.colourCode || "-"}
                                </td>

                                <td className="px-4 py-3">
                                  {item.proofFile || "-"}
                                </td>

                              </tr>

                            )
                          )}

                        </tbody>

                      </table>

                    </div>

                  </div>

                )}

                {/* =================================================
                    FAILED ROWS
                ================================================== */}

                {errors.length > 0 && (

                  <div className="
                    border
                    rounded-xl
                    border-red-200
                    overflow-hidden
                  ">

                    {/* ERROR HEADER */}

                    <div className="
                      bg-red-50
                      px-5
                      py-3
                      border-b
                      border-red-200
                      flex
                      items-center
                      justify-between
                      gap-3
                    ">

                      <div className="
                        flex
                        items-center
                        gap-2
                      ">

                        <MdError
                          className="text-red-600"
                        />

                        <h2 className="
                          font-semibold
                          text-red-700
                        ">
                          Upload Errors
                        </h2>

                      </div>

                      {/* DOWNLOAD */}

                      <button
                        onClick={downloadFailedRows}
                        className="
                          bg-red-600
                          hover:bg-red-700
                          text-white
                          px-4
                          py-2
                          rounded-lg
                          text-sm
                          font-medium
                          flex
                          items-center
                          gap-2
                        "
                      >

                        <MdDownload />

                        Download Failed Rows

                      </button>

                    </div>

                    {/* ERROR TABLE */}

                    <div className="overflow-x-auto">

                      <table className="w-full">

                        <thead className="bg-red-100">

                          <tr>

                            <th className="
                              text-left
                              px-4
                              py-3
                            ">
                              #
                            </th>

                            <th className="
                              text-left
                              px-4
                              py-3
                            ">
                              Application ID
                            </th>

                            <th className="
                              text-left
                              px-4
                              py-3
                            ">
                              Error Type
                            </th>

                            <th className="
                              text-left
                              px-4
                              py-3
                            ">
                              Reason
                            </th>

                            <th className="
                              text-left
                              px-4
                              py-3
                            ">
                              File Name
                            </th>

                          </tr>

                        </thead>

                        <tbody>

                          {errors.map(
                            (error, index) => {

                              /*
                               * IMPORTANT:
                               * Backend normally returns an object.
                               */

                              const isObject =
                                typeof error ===
                                "object" &&
                                error !== null;

                              const row =
                                isObject
                                  ? error.row
                                  : index + 1;

                              const applicationId =
                                isObject
                                  ? error.applicationId
                                  : "-";

                              const type =
                                isObject
                                  ? error.type
                                  : "UPLOAD_ERROR";

                              const reason =
                                isObject
                                  ? error.reason
                                  : error;

                              const fileName =
                                isObject
                                  ? error.fileName
                                  : "-";

                              return (
                                <tr
                                  key={index}
                                  className="border-t"
                                >

                                  <td className="px-4 py-3">
                                    {row || index + 1}
                                  </td>

                                  <td className="
                                    px-4
                                    py-3
                                    font-medium
                                  ">
                                    {applicationId || "-"}
                                  </td>

                                  <td className="px-4 py-3">

                                    <span className="
                                      bg-red-100
                                      text-red-700
                                      px-2
                                      py-1
                                      rounded-md
                                      text-xs
                                      font-medium
                                    ">

                                      {getErrorTypeLabel(
                                        type
                                      )}

                                    </span>

                                  </td>

                                  <td className="
                                    px-4
                                    py-3
                                    text-red-600
                                  ">
                                    {reason || "-"}
                                  </td>

                                  <td className="px-4 py-3">
                                    {fileName || "-"}
                                  </td>

                                </tr>
                              );
                            }
                          )}

                        </tbody>

                      </table>

                    </div>

                  </div>

                )}

              </div>

            )}

          </div>

        </div>

      </div>

    </DashboardLayout>
  );
}