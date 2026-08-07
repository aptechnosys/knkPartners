import { useEffect, useState } from "react";
import API from "../api/axios";
import DashboardLayout from "../layouts/DashboardLayout";

function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] =
    useState(true);

  const fetchLogs = async () => {
    try {
      const res =
        await API.get("/audit-logs");

      setLogs(
        res.data.data || []
      );
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <DashboardLayout
      title="Audit Log"
      breadcrumbs={[
        "Home",
        "Audit Log",
      ]}
    >
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">

        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">
            Audit Activity
          </h2>
        </div>

        {loading ? (
          <div className="p-6">
            Loading...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4">
                  Action
                </th>
                <th className="text-left p-4">
                  Details
                </th>
                <th className="text-left p-4">
                  Module
                </th>
                <th className="text-left p-4">
                  Time
                </th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr
                  key={log._id}
                  className="border-t"
                >
                  <td className="p-4 font-medium">
                    {log.action}
                  </td>

                  <td className="p-4">
                    {log.details}
                  </td>

                  <td className="p-4">
                    {log.module}
                  </td>

                  <td className="p-4">
                    {new Date(
                      log.createdAt
                    ).toLocaleString()}
                  </td>
                </tr>
              ))}

              {!logs.length && (
                <tr>
                  <td
                    colSpan="4"
                    className="p-6 text-center text-slate-500"
                  >
                    No audit logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AuditLog;