import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import API from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ArchivedCases() {
  const [cases, setCases] = useState([]);
  const [selectedCases, setSelectedCases] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===============================
  // FETCH ARCHIVED CASES
  // ===============================

  const fetchArchivedCases = async () => {
    try {
      setLoading(true);

      const res = await API.get(
        "/cases/archived"
      );

      setCases(res.data.data || []);

      // Clear selection after refresh
      setSelectedCases([]);
    } catch (error) {
      console.log(
        "Fetch archived cases error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to fetch archived cases"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedCases();
  }, []);

  // ===============================
  // RESTORE CASE
  // ===============================

  const restoreCase = async (id) => {
    try {
      const confirmed = window.confirm(
        "Restore this case?"
      );

      if (!confirmed) {
        return;
      }

      await API.patch(
        `/cases/${id}/restore`
      );

      alert(
        "Case restored successfully"
      );

      await fetchArchivedCases();
    } catch (error) {
      console.log(
        "Restore case error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to restore case"
      );
    }
  };

  // ===============================
  // SELECT / UNSELECT CASE
  // ===============================

  const handleSelect = (id) => {
    setSelectedCases((prev) => {
      if (prev.includes(id)) {
        return prev.filter(
          (item) => item !== id
        );
      }

      return [...prev, id];
    });
  };

  // ===============================
  // SELECT ALL
  // ===============================

  const handleSelectAll = () => {
    if (
      selectedCases.length ===
      cases.length
    ) {
      setSelectedCases([]);
      return;
    }

    setSelectedCases(
      cases.map((item) => item._id)
    );
  };

  // ===============================
  // BULK DELETE
  // ===============================

  const handleBulkDelete = async () => {
    try {
      if (
        selectedCases.length === 0
      ) {
        alert(
          "Please select at least one archived case."
        );
        return;
      }

      const confirmed = window.confirm(
        `Delete ${selectedCases.length} archived ${
          selectedCases.length === 1
            ? "case"
            : "cases"
        } permanently? This action cannot be undone.`
      );

      if (!confirmed) {
        return;
      }

      await API.delete(
        "/cases/bulk-delete",
        {
          data: {
            ids: selectedCases,
          },
        }
      );

      alert(
        "Cases deleted successfully"
      );

      await fetchArchivedCases();
    } catch (error) {
      console.log(
        "Bulk delete error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Delete failed"
      );
    }
  };

  // ===============================
  // LOADING
  // ===============================

  if (loading) {
    return (
      <DashboardLayout
        title="Archived Cases"
        breadcrumbs={[
          "Home",
          "Archived Cases",
        ]}
      >
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  // ===============================
  // UI
  // ===============================

  return (
    <DashboardLayout
      title="Archived Cases"
      breadcrumbs={[
        "Home",
        "Archived Cases",
      ]}
    >
      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">

          {/* =========================
              HEADER
          ========================== */}

          <div className="p-5 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">

            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Archived Cases
              </h2>

              <p className="text-slate-500 text-sm mt-1">
                Completed cases that have
                been archived.
              </p>
            </div>

            <button
              onClick={
                handleBulkDelete
              }
              disabled={
                selectedCases.length === 0
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedCases.length === 0
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              Delete Selected
              {selectedCases.length >
                0 &&
                ` (${selectedCases.length})`}
            </button>
          </div>

          {/* =========================
              EMPTY STATE
          ========================== */}

          {cases.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-slate-400 text-5xl mb-4">
                📁
              </div>

              <h3 className="text-lg font-semibold text-slate-700">
                No Archived Cases
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Completed cases that are
                archived will appear here.
              </p>
            </div>
          ) : (
            /* =========================
               TABLE
            ========================== */

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">

                <thead className="bg-slate-50">
                  <tr>

                    {/* SELECT ALL */}

                    <th className="p-4 text-center w-12">
                      <input
                        type="checkbox"
                        checked={
                          cases.length >
                            0 &&
                          selectedCases.length ===
                            cases.length
                        }
                        onChange={
                          handleSelectAll
                        }
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>

                    <th className="p-4 text-left text-sm font-semibold text-slate-700">
                      Ref No
                    </th>

                    <th className="p-4 text-left text-sm font-semibold text-slate-700">
                      Candidate
                    </th>

                    <th className="p-4 text-left text-sm font-semibold text-slate-700">
                      Vendor
                    </th>

                    <th className="p-4 text-left text-sm font-semibold text-slate-700">
                      Status
                    </th>

                    <th className="p-4 text-left text-sm font-semibold text-slate-700">
                      Archived On
                    </th>

                    <th className="p-4 text-left text-sm font-semibold text-slate-700">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {cases.map((item) => (
                    <tr
                      key={item._id}
                      className="border-t hover:bg-slate-50 transition"
                    >

                      {/* SELECT */}

                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCases.includes(
                            item._id
                          )}
                          onChange={() =>
                            handleSelect(
                              item._id
                            )
                          }
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* REF NO */}

                      <td className="p-4 text-sm font-medium text-slate-800">
                        {item.comp_ref_no ||
                          "-"}
                      </td>

                      {/* CANDIDATE */}

                      <td className="p-4 text-sm text-slate-700">
                        {item.candidate_name ||
                          "-"}
                      </td>

                      {/* VENDOR */}

                      <td className="p-4 text-sm text-slate-700">
                        {item.vendor || "-"}
                      </td>

                      {/* STATUS */}

                      <td className="p-4">
                        <StatusBadge
                          status={
                            item.check_status
                          }
                        />
                      </td>

                      {/* ARCHIVED DATE */}

                      <td className="p-4 text-sm text-slate-600">
                        {item.archivedAt
                          ? new Date(
                              item.archivedAt
                            ).toLocaleString()
                          : "-"}
                      </td>

                      {/* ACTION */}

                      <td className="p-4">
                        <button
                          onClick={() =>
                            restoreCase(
                              item._id
                            )
                          }
                          className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}