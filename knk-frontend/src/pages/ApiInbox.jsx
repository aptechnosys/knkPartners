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

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await API.get("/api-inbox");
      setCases(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInbox(); }, []);

  const filtered = cases.filter(c =>
  !search ||
  c.applicationId?.toLowerCase().includes(search.toLowerCase()) ||
  c.candidateName?.toLowerCase().includes(search.toLowerCase())
);

const handleProcess = async (id) => {
  try {

    const res = await API.post(
      `/api-inbox/process/${id}`
    );

    alert(res.data.message);

    // refresh inbox
    fetchInbox();

    // optional redirect to cases page
    navigate(`/cases/${res.data.case._id}`);

  } catch (err) {
    console.error(err);

    alert(
      err?.response?.data?.message ||
      "Processing failed"
    );
  }
};

  return (
    <DashboardLayout title="API Requests Inbox" breadcrumbs={["Home", "API Inbox"]}>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">API Requests Inbox</h1>
          <p className="text-xs text-slate-400 mt-0.5">Home / API Inbox</p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <MdInfo className="text-blue-500 text-lg shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            <strong>Read-Only View.</strong> These are raw records received from the external client API. To process a case, assign it to an employee from the{" "}
            <button onClick={() => navigate("/cases")} className="underline font-semibold">Cases</button> section.
          </p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name / application ID..."
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5 transition-colors">
              <MdSearch /> Search
            </button>
            <button onClick={() => setSearch("")}
              className="border border-slate-200 px-4 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">Incoming Requests</span>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{filtered.length}</span>
            </div>
            <span className="flex items-center gap-1 bg-blue-50 text-blue-600 text-[10px] font-medium px-2 py-1 rounded-full">
              🔒 Source: Client API
            </span>
          </div>
          {loading ? <LoadingSpinner /> : filtered.length === 0 ? <EmptyState title="No incoming requests" message="No new API requests at this time." /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Application ID", "Candidate Name", "Father Name", "DOB", "City", "State", "Vendor", "TAT", "Ext. Status", "Attachment", "Remark", "Received", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                {filtered.map(c => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors">

                    <td className="px-4 py-3.5 text-xs font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {c.applicationId || "—"}
                    </td>

                    <td className="px-4 py-3.5 text-sm font-medium text-slate-900 whitespace-nowrap">
                      {c.candidateName || "—"}
                    </td>

                    <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                      {c.fatherName || "—"}
                    </td>

                    <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                      {c.dob || "—"}
                    </td>

                    <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                      {c.city || "—"}
                    </td>

                    <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                      {c.state || "—"}
                    </td>

                    <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                      {c.vendor || "—"}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600">
                        {c.tat ? `${c.tat} days` : "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.extStatus || "PENDING"} />
                    </td>

                    <td className="px-4 py-3.5 text-slate-400 text-sm">
                      —
                    </td>

                    <td className="px-4 py-3.5 text-sm text-slate-500 max-w-[140px] truncate">
                      {c.remark || "—"}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>

                    <td className="px-4 py-3.5">
                      {/* <button
                        onClick={() => navigate(`/cases/${c._id}`)}
                        className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        → Process
                      </button> */}

                      <button
                      onClick={() => handleProcess(c._id)}
                      className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      → Process
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
