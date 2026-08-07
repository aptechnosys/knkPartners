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
} from "react-icons/md";

export default function BulkUpload() {
  const [excelFile, setExcelFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState(null);

  const [errors, setErrors] = useState([]);

  const handleExcel = (e) => {
    setExcelFile(e.target.files[0]);
  };

  const handleZip = (e) => {
    setZipFile(e.target.files[0]);
  };

  const resetForm = () => {
    setExcelFile(null);
    setZipFile(null);
    setErrors([]);
    setResult(null);

    document.getElementById("excelInput").value = "";
    document.getElementById("zipInput").value = "";
  };

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

      setResult(res);

      if (res.errors) {
        setErrors(res.errors);
      }
    } catch (err) {
      console.log(err);

      setErrors([
        err.response?.data?.message ||
          "Upload failed",
      ]);
    } finally {
      setLoading(false);
    }
  };

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

            <div className="space-y-3">

              <h2 className="font-semibold text-slate-800 flex items-center gap-2">

                <MdDescription />

                File Upload (Excel)
                <span className="text-red-500">*</span>

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
                <b> 50 records </b>
                allowed.
              </p>

            </div>

            <div className="space-y-3">

              <h2 className="font-semibold text-slate-800 flex items-center gap-2">

                <MdFolderZip />

                Annexure ZIP
                <span className="text-red-500">*</span>

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
                <b> REF-001 </b>

                <br />

                ZIP :
                <b> REF-001.pdf </b>

              </p>

            </div>

            <div className="flex gap-3">

              <button
                onClick={handleUpload}
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                {loading
                  ? "Uploading..."
                  : "Upload"}
              </button>

              <button
                onClick={resetForm}
                className="border px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-slate-50"
              >
                <MdRefresh />

                Reset

              </button>

            </div>

                        {/* Upload Result */}
            {result && (
              <div className="space-y-6">

                {/* Summary */}
                <div className="border rounded-xl bg-green-50 border-green-200 p-5">

                  <div className="flex items-center gap-2 mb-4">
                    <MdCheckCircle className="text-green-600 text-2xl" />
                    <h2 className="font-bold text-green-700">
                      Bulk Upload Completed
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-xs text-slate-500 uppercase">
                        Total Rows
                      </p>

                      <p className="text-2xl font-bold mt-2">
                        {result.summary?.totalRows || 0}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-xs text-slate-500 uppercase">
                        Matched
                      </p>

                      <p className="text-2xl font-bold mt-2 text-blue-600">
                        {result.summary?.matched || 0}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-xs text-slate-500 uppercase">
                        Updated
                      </p>

                      <p className="text-2xl font-bold mt-2 text-green-600">
                        {result.summary?.updated || 0}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-xs text-slate-500 uppercase">
                        Failed
                      </p>

                      <p className="text-2xl font-bold mt-2 text-red-600">
                        {result.summary?.failed || 0}
                      </p>
                    </div>

                  </div>

                </div>

                {/* Updated Cases */}
                {result.updatedCases?.length > 0 && (

                  <div className="border rounded-xl overflow-hidden">

                    <div className="bg-slate-50 px-5 py-3 border-b">
                      <h2 className="font-semibold">
                        Updated Cases
                      </h2>
                    </div>

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

                        {result.updatedCases.map((item, index) => (

                          <tr
                            key={index}
                            className="border-t"
                          >

                            <td className="px-4 py-3">
                              {item.referenceNo}
                            </td>

                            <td className="px-4 py-3">

                              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">

                                {item.status}

                              </span>

                            </td>

                            <td className="px-4 py-3">
                              {item.colourCode}
                            </td>

                            <td className="px-4 py-3">
                              {item.proofFile}
                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                )}

                {/* Errors */}
                {errors.length > 0 && (

                  <div className="border rounded-xl border-red-200 overflow-hidden">

                    <div className="bg-red-50 px-5 py-3 border-b border-red-200 flex items-center gap-2">

                      <MdError className="text-red-600" />

                      <h2 className="font-semibold text-red-700">

                        Upload Errors

                      </h2>

                    </div>

                    <table className="w-full">

                      <thead className="bg-red-100">

                        <tr>

                          <th className="text-left px-4 py-3">
                            #
                          </th>

                          <th className="text-left px-4 py-3">
                            Reason
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {errors.map((err, index) => (

                          <tr
                            key={index}
                            className="border-t"
                          >

                            <td className="px-4 py-3">
                              {index + 1}
                            </td>

                            <td className="px-4 py-3 text-red-600">
                              {err}
                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

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