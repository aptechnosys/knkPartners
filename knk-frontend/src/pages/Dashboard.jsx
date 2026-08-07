import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import API from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  MdFolder, MdInbox, MdSync, MdWarning,
  MdVisibility, MdSyncAlt, MdCheckCircle, MdHourglassEmpty,
  MdBlock, MdPause, MdStop, MdSearch
} from "react-icons/md";

const STATUS_CARDS = [
  {
    key: "NEW",
    label: "New",
    countKey: "newCases",
    color: "bg-blue-50 text-blue-700 border-blue-100"
  },

  {
    key: "IN_PROGRESS",
    label: "In Progress",
    countKey: "inProgressCases",
    color: "bg-indigo-50 text-indigo-700 border-indigo-100"
  },

  {
    key: "Q_CHECK",
    label: "Q-Check",
    countKey: "qCheckCases",
    color: "bg-purple-50 text-purple-700 border-purple-100"
  },

  {
    key: "DONE",
    label: "Done",
    countKey: "doneCases",
    color: "bg-green-50 text-green-700 border-green-100"
  },

  {
    key: "INSUFFICIENT",
    label: "Insufficient",
    countKey: "insufficientCases",
    color: "bg-orange-50 text-orange-700 border-orange-100"
  },

  {
    key: "ON_HOLD",
    label: "On Hold",
    countKey: "onHoldCases",
    color: "bg-yellow-50 text-yellow-700 border-yellow-100"
  },

  {
    key: "STOPPED",
    label: "Stopped",
    countKey: "stoppedCases",
    color: "bg-slate-50 text-slate-600 border-slate-100"
  },

  {
    key: "REJECTED",
    label: "Rejected",
    countKey: "rejectedCases",
    color: "bg-red-50 text-red-700 border-red-100"
  }
];




function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  trend,
  onClick
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-100 p-5 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
    >
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </p>

        <p className="text-3xl font-bold text-slate-900 mt-1">
          {value}
        </p>

        {trend && (
          <p className="text-xs text-slate-400 mt-1">
            {trend}
          </p>
        )}
      </div>

      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="text-2xl" />
      </div>
    </div>
  );
}

function getTATLeft(createdAt, tat) {
  if (!tat) return null;
  const days = parseInt(tat);
  if (isNaN(days)) return tat;
  const created = new Date(createdAt);
  const deadline = new Date(created.getTime() + days * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiInboxCount, setApiInboxCount] = useState(0);
  const [apiActivity, setApiActivity] = useState([]);


  const fetchInboxCount = async () => {
  try {

    const res = await API.get("/api-inbox");

    const pendingRequests = res.data.filter(
      item => item.processed === false
    );

    setApiInboxCount(pendingRequests.length);

  } catch (err) {
    console.log(err);
  }
};
   useEffect(() => {

  const fetchAll = async () => {
    try {

      const [
            statsRes,
            casesRes,
            activityRes
          ] = await Promise.all([
            API.get("/reports/summary"),
            API.get("/cases?limit=5"),
            API.get("/api-inbox/activity"),
          ]);

      setStats(statsRes.data.data);
      setRecentCases(casesRes.data.data || []);
      setApiActivity(activityRes.data.data || []);


    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  fetchAll();
  fetchInboxCount();

}, []);

  // for bell icon on dashboard
const notificationCount =
   stats?.pendingCases || 0;


   const completedToday = recentCases.filter(
  c =>
    c.check_status === "DONE" &&
    new Date(c.updatedAt).toDateString() ===
    new Date().toDateString()
).length;

  if (loading) return (
    <DashboardLayout title="Dashboard" breadcrumbs={["Home", "Dashboard"]}>
      <LoadingSpinner text="Loading dashboard..." />
    </DashboardLayout>
  );

  return (
    <DashboardLayout
        title="Dashboard"
        breadcrumbs={["Home", "Dashboard"]}
        notificationCount={
          user?.role === "admin"
            ? apiInboxCount
            : 0
        }
        apiInboxCount={apiInboxCount}
      >
      <div className="space-y-6">

       {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <StatCard
          label={isAdmin ? "TOTAL CASES" : "MY ASSIGNED CASES"}
          value={
            isAdmin
              ? stats?.totalCases ?? 0
              : recentCases.length
          }
          icon={MdFolder}
          iconBg="bg-blue-50 text-blue-500"
          onClick={() => navigate("/cases")}
        />

        <StatCard
          label={isAdmin ? "NEW / UNASSIGNED" : "COMPLETED TODAY"}
          value={
            isAdmin
              ? stats?.newCases ?? 0
              : completedToday
          }
          icon={MdInbox}
          iconBg="bg-slate-100 text-slate-500"
          onClick={() => navigate("/cases?status=NEW")}
        />

        <StatCard
          label="IN PROGRESS"
          value={stats?.inProgressCases ?? 0}
          icon={MdSync}
          iconBg="bg-indigo-50 text-indigo-500"
          onClick={() => navigate("/cases?status=IN_PROGRESS")}
        />

        <StatCard
          label="OVERDUE"
          value={
            recentCases.filter((c) => {
              if (!c.tat) return false;

              const tatLeft = getTATLeft(
                c.createdAt,
                c.tat
              );

              return (
                tatLeft !== null &&
                tatLeft < 0 &&
                ![
                  "DONE",
                  "REJECTED",
                  "STOPPED",
                ].includes(
                  c.check_status?.toUpperCase()
                )
              );
            }).length
          }
          icon={MdWarning}
          iconBg="bg-red-50 text-red-500"
          onClick={() => navigate("/cases?overdue=true")}
        />

      </div>

        {/* Cases by Status + Employee Workload */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Cases by Status */}
          {isAdmin && (
          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <MdSyncAlt className="text-blue-600 text-xl" />
              <h2 className="font-bold text-slate-900">Cases by Status</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STATUS_CARDS.map(s => (
                <div key={s.key}
                  onClick={() => {

                    if (s.key === "OVERDUE") {
                      navigate("/cases?overdue=true");
                    }

                    else if (s.key === "PENDING") {
                      navigate("/cases?pending=true");
                    }

                    else {
                      navigate(`/cases?status=${s.key}`);
                    }

                  }}
                  className={`border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all ${s.color}`}>
                  <div className="text-2xl font-bold">
                    {stats?.[s.countKey] ?? 0}
                  </div>
                  <div className="text-xs font-medium mt-1 opacity-80">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          )
        }

          {/* Employee Workload */}
          {isAdmin && (
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <MdSearch className="text-blue-600 text-xl" />
              <h2 className="font-bold text-slate-900">Employee Workload</h2>
            </div>
            <div className="space-y-4">
              {recentCases.filter(c => c.assignedTo).reduce((acc, c) => {
                const name = c.assignedTo?.email || "Unknown";
                const existing = acc.find(a => a.name === name);
                if (existing) existing.count++;
                else acc.push({ name, count: 1 });
                return acc;
              }, []).map((emp, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-700 font-medium truncate max-w-[120px]">{emp.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">{emp.count} open</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${Math.min(emp.count * 25, 100)}%` }} />
                  </div>
                </div>
              ))}
              {recentCases.every(c => !c.assignedTo) && (

                <div className="text-center py-8">

                <img
                src="/empty.svg"
                alt="empty"
                className="w-28 mx-auto opacity-70"
                />

                <p className="text-slate-400 mt-3">
                No case assigned yet
                </p>

                </div>

                )}
            </div>
          </div>
             )}
        </div>
         

        {/* Recent Cases Table */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MdSyncAlt className="text-blue-600 text-xl" />
              <h2 className="font-bold text-slate-900">Recent Cases</h2>
            </div>
            <button onClick={() => navigate("/cases")}
              className="text-xs text-blue-600 font-medium border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-slate-50">
                  {["App ID", "Candidate", "City", "Status", "TAT Left", "Assigned To", "Created", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentCases.map(c => {
                  const tatLeft = getTATLeft(c.createdAt, c.tat);
                  const isOverdue = tatLeft !== null && tatLeft < 0;
                  return (
                    <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-600 whitespace-nowrap">{c.comp_ref_no}</td>
                      <td className="px-4 py-3.5 text-sm font-medium text-slate-900 whitespace-nowrap">{c.candidate_name}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">{c.city}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={c.check_status} /></td>
                      <td className="px-4 py-3.5">
                        {tatLeft !== null ? (
                          <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-slate-600"}`}>
                            {isOverdue ? "Overdue" : `${tatLeft}d left`}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                        {c.assignedTo?.email ? (
                          <span>{c.assignedTo.email.split("@")[0]}</span>
                        ) : <span className="text-slate-300 italic text-xs">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => navigate(`/cases/${c._id}`)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                          <MdVisibility className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {recentCases.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-400">No cases found</div>
            )}
          </div>
        </div>
        
        {/* Recent API Activity */}
        {isAdmin && (
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MdSyncAlt className="text-blue-600 text-xl" />
            <h2 className="font-bold text-slate-900">
              Recent API Activity
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                {[
                  "App ID",
                  "Candidate",
                  "Status",
                  "Source",
                  "Time"
                ].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {apiActivity.map(item => (
                <tr
                  key={item._id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-xs font-mono">
                    {item.applicationId}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {item.candidateName}
                  </td>

                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.processed
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {item.processed
                        ? "Processed"
                        : "Pending"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-500">
                    {item.source}
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(
                      item.createdAt
                    ).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {apiActivity.length === 0 && (
            <div className="py-10 text-center text-slate-400">
              No API activity found
            </div>
          )}
        </div>
      </div>
      )}
      </div>
      
    </DashboardLayout>
  );
}
