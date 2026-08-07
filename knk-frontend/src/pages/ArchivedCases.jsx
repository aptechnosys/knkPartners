import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import API from "../api/axios";

export default function ArchivedCases() {

  const [cases, setCases] = useState([]);
  const [selectedCases, setSelectedCases] =
    useState([]);

  const fetchArchivedCases = async () => {
    try {

      const res = await API.get(
        "/cases/archived"
      );

      setCases(res.data.data || []);

    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchArchivedCases();
  }, []);

  const restoreCase = async (id) => {
    try {

      if (
        !window.confirm(
          "Restore this case?"
        )
      ) {
        return;
      }

      await API.patch(
        `/cases/${id}/restore`
      );

      fetchArchivedCases();

      alert(
        "Case restored successfully"
      );

    } catch (error) {

      console.log(error);

      alert(
        error?.response?.data?.message ||
        "Failed to restore case"
      );

    }
  };

  const handleSelect = (id) => {

    setSelectedCases((prev) =>
      prev.includes(id)
        ? prev.filter(
            (item) => item !== id
          )
        : [...prev, id]
    );

  };

  const handleSelectAll = () => {

    if (
      selectedCases.length ===
      cases.length
    ) {
      setSelectedCases([]);
    } else {
      setSelectedCases(
        cases.map(
          (item) => item._id
        )
      );
    }

  };

  const handleBulkDelete =
    async () => {

      try {

        if (
          selectedCases.length === 0
        ) {
          alert(
            "Please select cases"
          );
          return;
        }

        if (
          !window.confirm(
            `Delete ${selectedCases.length} archived cases permanently?`
          )
        ) {
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

        setSelectedCases([]);

        fetchArchivedCases();

      } catch (error) {

        console.log(error);

        alert(
          error?.response?.data
            ?.message ||
            "Delete failed"
        );

      }
    };

  return (
    <DashboardLayout>
      <div className="p-6">

        <div className="bg-white rounded-xl border">

          <div className="p-5 border-b flex justify-between items-center">

            <div>

              <h2 className="text-xl font-semibold">
                Archived Cases
              </h2>

              <p className="text-slate-500 text-sm">
                Archived / Closed Cases
              </p>

            </div>

            <button
              onClick={
                handleBulkDelete
              }
              className="bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              Delete Selected
            </button>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-slate-50">

                <tr>

                  <th className="p-4">
                    <input
                      type="checkbox"
                      checked={
                        cases.length > 0 &&
                        selectedCases.length ===
                          cases.length
                      }
                      onChange={
                        handleSelectAll
                      }
                    />
                  </th>

                  <th className="p-4 text-left">
                    Ref No
                  </th>

                  <th className="p-4 text-left">
                    Candidate
                  </th>

                  <th className="p-4 text-left">
                    Vendor
                  </th>

                  <th className="p-4 text-left">
                    Status
                  </th>

                  <th className="p-4 text-left">
                    Archived On
                  </th>

                  <th className="p-4 text-left">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {cases.map((item) => (

                  <tr
                    key={item._id}
                    className="border-t"
                  >

                    <td className="p-4">

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
                      />

                    </td>

                    <td className="p-4">
                      {item.comp_ref_no}
                    </td>

                    <td className="p-4">
                      {item.candidate_name}
                    </td>

                    <td className="p-4">
                      {item.vendor}
                    </td>

                    <td className="p-4">
                      {item.check_status}
                    </td>

                    <td className="p-4">
                      {item.archivedAt
                        ? new Date(
                            item.archivedAt
                          ).toLocaleString()
                        : "-"}
                    </td>

                    <td className="p-4">

                      <button
                        onClick={() =>
                          restoreCase(
                            item._id
                          )
                        }
                        className="bg-green-100 text-green-700 px-3 py-1 rounded"
                      >
                        Restore
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}