import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import API from "../api/axios";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import { MdSearch, MdClear, MdInfo } from "react-icons/md";

export default function ApiInbox() {
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Selected API request IDs
  const [selectedIds, setSelectedIds] = useState([]);

  // Bulk processing state
  const [processing, setProcessing] = useState(false);

  // Individual processing state
  const [processingId, setProcessingId] = useState(null);

  // ============================================================
  // FETCH API INBOX
  // ============================================================
  const fetchInbox = async () => {
    setLoading(true);

    try {
      const res = await API.get("/api-inbox");

      setCases(res.data || []);

      // Clear selection whenever inbox is refreshed
      setSelectedIds([]);
    } catch (err) {
      console.error("Failed to fetch API inbox:", err);

      alert(
        err?.response?.data?.message ||
        "Failed to load API requests"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  // ============================================================
  // SEARCH
  // ============================================================
  const filtered = cases.filter((c) =>
    !search ||
    c.applicationId
      ?.toLowerCase()
      .includes(search.toLowerCase()) ||
    c.candidateName
      ?.toLowerCase()
      .includes(search.toLowerCase()) ||
    c.fatherName
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  // ============================================================
  // SELECT / UNSELECT SINGLE REQUEST
  // ============================================================
  const handleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((selectedId) => selectedId !== id);
      }

      return [...prev, id];
    });
  };

  // ============================================================
  // SELECT / UNSELECT ALL VISIBLE REQUESTS
  // ============================================================
  const handleSelectAll = () => {
    const filteredIds = filtered.map((c) => c._id);

    const allSelected =
      filteredIds.length > 0 &&
      filteredIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      // Remove visible IDs from selection
      setSelectedIds((prev) =>
        prev.filter((id) => !filteredIds.includes(id))
      );
    } else {
      // Add visible IDs to selection
      setSelectedIds((prev) => [
        ...new Set([...prev, ...filteredIds]),
      ]);
    }
  };

  // ============================================================
  // CHECK WHETHER ALL VISIBLE ROWS ARE SELECTED
  // ============================================================
  const allSelected =
    filtered.length > 0 &&
    filtered.every((c) => selectedIds.includes(c._id));

  // ============================================================
  // INDIVIDUAL PROCESS
  // ============================================================
  const handleProcess = async (id) => {
    if (processing || processingId) {
      return;
    }

    try {
      setProcessingId(id);

      const res = await API.post(
        `/api-inbox/process/${id}`
      );

      alert(
        res?.data?.message ||
        "Case processed successfully"
      );

      // Refresh inbox.
      // Processed request will disappear because
      // GET /api-inbox returns processed:false records.
      await fetchInbox();

      // Go to New Cases
      navigate("/cases");

    } catch (err) {
      console.error("Processing failed:", err);

      alert(
        err?.response?.data?.message ||
        "Processing failed"
      );
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================================
  // BULK PROCESS
  // ============================================================
  const handleBulkProcess = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one request.");
      return;
    }

    if (processing || processingId) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to process ${selectedIds.length} selected request(s)?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessing(true);

      const res = await API.post(
        "/api-inbox/process-bulk",
        {
          requestIds: selectedIds,
        }
      );

      console.log("Bulk processing response:", res.data);

      const summary = res?.data?.summary;

      if (summary) {
        alert(
          `Bulk processing completed.\n\n` +
          `Received: ${summary.received}\n` +
          `Processed: ${summary.processed}\n` +
          `Already Processed: ${summary.alreadyProcessed}\n` +
          `Not Found: ${summary.notFound}\n` +
          `Failed: ${summary.failed}`
        );
      } else {
        alert(
          res?.data?.message ||
          "Bulk processing completed"
        );
      }

      // Refresh inbox.
      // Successfully processed requests disappear from inbox.
      await fetchInbox();

      // Go to New Cases section
      navigate("/cases");

    } catch (err) {
      console.error("Bulk processing failed:", err);

      alert(
        err?.response?.data?.message ||
        "Bulk processing failed"
      );
    } finally {
      setProcessing(false);
    }
  };

  // ============================================================
  // CLEAR SEARCH
  // ============================================================
  const handleClearSearch = () => {
    setSearch("");
  };

  // ============================================================
  // UI
  // ============================================================
  return (
    <DashboardLayout
      title="API Requests Inbox"
      breadcrumbs={["Home", "API Inbox"]}
    >
      <div className="space-y-4">

        {/* ======================================================
            PAGE HEADER
        ====================================================== */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            API Requests Inbox
          </h1>

          <p className="text-xs text-slate-400 mt-0.5">
            Home / API Inbox
          </p>
        </div>

        {/* ======================================================
            INFO BANNER
        ====================================================== */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <MdInfo className="text-blue-500 text-lg shrink-0 mt-0.5" />

          <p className="text-sm text-blue-700">
            <strong>Incoming Client API Requests.</strong>{" "}
            Select one or multiple requests and process them.
            Processed requests will be created as new cases.
          </p>
        </div>

        {/* ======================================================
            SEARCH
        ====================================================== */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex gap-3">

            <div className="relative flex-1 max-w-sm">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name / application ID..."
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5 transition-colors"
            >
              <MdSearch />
              Search
            </button>

            <button
              onClick={handleClearSearch}
              className="border border-slate-200 px-4 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <MdClear />
              Clear
            </button>

          </div>
        </div>

        {/* ======================================================
            TABLE
        ====================================================== */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">

          {/* TABLE HEADER */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                Incoming Requests
              </span>

              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {filtered.length}
              </span>

              {selectedIds.length > 0 && (
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {selectedIds.length} Selected
                </span>
              )}
            </div>

            <span className="flex items-center gap-1 bg-blue-50 text-blue-600 text-[10px] font-medium px-2 py-1 rounded-full">
              🔒 Source: Client API
            </span>

          </div>

          {/* ====================================================
              BULK ACTION BAR
          ==================================================== */}
          {selectedIds.length > 0 && (
            <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">

              <div className="text-sm text-blue-700 font-medium">
                {selectedIds.length} request
                {selectedIds.length > 1 ? "s" : ""} selected
              </div>

              <div className="flex items-center gap-2">

                <button
                  onClick={() => setSelectedIds([])}
                  disabled={processing}
                  className="border border-slate-300 bg-white text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Clear Selection
                </button>

                <button
                  onClick={handleBulkProcess}
                  disabled={processing}
                  className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing
                    ? "Processing..."
                    : `→ Process ${selectedIds.length}`}
                </button>

              </div>
            </div>
          )}

          {/* ====================================================
              LOADING
          ==================================================== */}
          {loading ? (
            <LoadingSpinner />

          ) : filtered.length === 0 ? (

            <EmptyState
              title="No incoming requests"
              message="No new API requests at this time."
            />

          ) : (

            /* ==================================================
               TABLE
            ================================================== */
            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">

                    {/* SELECT ALL */}
                    <th className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleSelectAll}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                    </th>

                    {[
                      "Application ID",
                      "Candidate Name",
                      "Father Name",
                      "DOB",
                      "Address",
                      "City",
                      "State",
                      "Vendor",
                      "TAT",
                      "Ext. Status",
                      "Attachment",
                      "Remark",
                      "Received",
                      "Action",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}

                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">

                  {filtered.map((c) => {

                    const isSelected =
                      selectedIds.includes(c._id);

                    const isProcessing =
                      processingId === c._id;

                    return (
                      <tr
                        key={c._id}
                        className={`transition-colors ${
                          isSelected
                            ? "bg-blue-50"
                            : "hover:bg-slate-50"
                        }`}
                      >

                        {/* CHECKBOX */}
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handleSelect(c._id)
                            }
                            disabled={processing}
                            className="w-4 h-4 accent-blue-600 cursor-pointer"
                          />
                        </td>

                        {/* APPLICATION ID */}
                        <td className="px-4 py-3.5 text-xs font-mono font-semibold text-slate-700 whitespace-nowrap">
                          {c.applicationId || "—"}
                        </td>

                        {/* CANDIDATE NAME */}
                        <td className="px-4 py-3.5 text-sm font-medium text-slate-900 whitespace-nowrap">
                          {c.candidateName || "—"}
                        </td>

                        {/* FATHER NAME */}
                        <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                          {c.fatherName || "—"}
                        </td>

                        {/* DOB */}
                        <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                          {c.dob || "—"}
                        </td>

                        {/* ADDRESS */}
                        <td className="px-4 py-3.5 text-sm text-slate-500 max-w-[220px] truncate">
                          {c.address || "—"}
                        </td>

                        {/* CITY */}
                        <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                          {c.city || "—"}
                        </td>

                        {/* STATE */}
                        <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                          {c.state || "—"}
                        </td>

                        {/* VENDOR */}
                        <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                          {c.vendor || "—"}
                        </td>

                        {/* TAT */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">
                            {c.tat
                              ? `${c.tat} days`
                              : "—"}
                          </span>
                        </td>

                        {/* EXT STATUS */}
                        <td className="px-4 py-3.5">
                          <StatusBadge
                            status={
                              c.extStatus ||
                              "PENDING"
                            }
                          />
                        </td>

                        {/* ATTACHMENT */}
                        <td className="px-4 py-3.5 text-slate-400 text-sm">
                          {c.attachment || "—"}
                        </td>

                        {/* REMARK */}
                        <td className="px-4 py-3.5 text-sm text-slate-500 max-w-[140px] truncate">
                          {c.remark || "—"}
                        </td>

                        {/* RECEIVED */}
                        <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                          {c.createdAt
                            ? new Date(
                                c.createdAt
                              ).toLocaleString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "—"}
                        </td>

                        {/* INDIVIDUAL PROCESS */}
                        <td className="px-4 py-3.5">

                          <button
                            onClick={() =>
                              handleProcess(c._id)
                            }
                            disabled={
                              processing ||
                              processingId !== null
                            }
                            className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing
                              ? "Processing..."
                              : "→ Process"}
                          </button>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}