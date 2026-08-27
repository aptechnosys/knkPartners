import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import API from "../api/axios";

const ApiLogs = () => {
  const [logs, setLogs] = useState([]);
  const [sourceFilter, setSourceFilter] =
    useState("ALL");

  const fetchLogs = async () => {
    try {
      const res = await API.get(
        "/api-logs"
      );

      setLogs(res.data.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs =
    sourceFilter === "ALL"
      ? logs
      : logs.filter(
          (log) =>
            log.source === sourceFilter
        );

  const getStatusBadge = (status) => {
    if (
      status === "SUCCESS" ||
      status === "PROCESSED" ||
      status === "WEBHOOK_SENT"
    ) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
          {status}
        </span>
      );
    }

    if (
      status === "FAILED" ||
      status === "WEBHOOK_FAILED"
    ) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
          {status}
        </span>
      );
    }

    return (
      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
        {status}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6">

        {/* Header */}
        <div className="bg-white rounded-xl shadow border mb-4">

          <div className="p-5 border-b flex justify-between items-center">

            <div>
              <h2 className="text-xl font-semibold">
                API Activity Logs
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Total Logs:
                {" "}
                {filteredLogs.length}
              </p>
            </div>

            <select
              value={sourceFilter}
              onChange={(e) =>
                setSourceFilter(
                  e.target.value
                )
              }
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">
                All Logs
              </option>

              <option value="Client API">
                Client API
              </option>

              <option value="WEBHOOK">
                Webhooks
              </option>
            </select>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-gray-50">

                <tr>

                  <th className="p-4 text-left">
                    App ID
                  </th>

                  <th className="p-4 text-left">
                    Endpoint
                  </th>

                  <th className="p-4 text-left">
                    Method
                  </th>

                  <th className="p-4 text-left">
                    Status
                  </th>

                  <th className="p-4 text-left">
                    Source
                  </th>

                  <th className="p-4 text-left">
                    Time
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center p-6 text-slate-500"
                    >
                      No logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(
                    (log) => (
                      <tr
                        key={log._id}
                        className="border-t hover:bg-slate-50"
                      >
                        <td className="p-4 font-medium">
                          {log.appId}
                        </td>

                        <td className="p-4 max-w-xs truncate">
                          {log.endpoint}
                        </td>

                        <td className="p-4">
                          {log.method}
                        </td>

                        <td className="p-4">
                          {getStatusBadge(
                            log.status
                          )}
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              log.source ===
                              "WEBHOOK"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {log.source}
                          </span>
                        </td>

                        <td className="p-4 text-sm text-slate-600">
                          {new Date(
                            log.createdAt
                          ).toLocaleString()}
                        </td>
                      </tr>
                    )
                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
};

export default ApiLogs;