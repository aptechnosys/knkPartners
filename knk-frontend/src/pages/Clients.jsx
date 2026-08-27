import { useState, useEffect } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { MdAdd, MdEdit } from "react-icons/md";
import API from "../api/axios";

function Clients() {
  // ============================================
  // ADD CLIENT MODAL
  // ============================================

  const [showModal, setShowModal] = useState(false);

  // ============================================
  // EDIT CLIENT MODAL
  // ============================================

  const [showEditModal, setShowEditModal] = useState(false);

  const [editingClient, setEditingClient] = useState(null);

  // ============================================
  // CLIENT DATA
  // ============================================

  const [clients, setClients] = useState([]);

  // ============================================
  // ADD CLIENT FORM
  // ============================================

  const [vendorName, setVendorName] = useState("");

  const [callbackUrl, setCallbackUrl] = useState("");

  // ============================================
  // EDIT CLIENT FORM
  // ============================================

  const [editCallbackUrl, setEditCallbackUrl] =
    useState("");

  // ============================================
  // LOADING
  // ============================================

  const [loading, setLoading] = useState(false);

  // ============================================
  // FETCH CLIENTS
  // ============================================

  const fetchClients = async () => {
    try {
      const { data } = await API.get("/clients");

      setClients(data.clients || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // ============================================
  // CREATE CLIENT
  // ============================================

  const saveClient = async () => {
    try {
      if (!vendorName.trim()) {
        return alert("Vendor name is required");
      }

      setLoading(true);

      await API.post("/clients", {
        vendorName,
        callbackUrl,
      });

      setVendorName("");
      setCallbackUrl("");

      setShowModal(false);

      fetchClients();

      alert("Client created successfully");
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Failed to create client"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // OPEN EDIT MODAL
  // ============================================

  const openEditModal = (client) => {
    setEditingClient(client);

    setEditCallbackUrl(
      client.callbackUrl || ""
    );

    setShowEditModal(true);
  };

  // ============================================
  // UPDATE CLIENT
  // ============================================

  const updateClient = async () => {
    try {
      if (!editingClient) {
        return;
      }

      setLoading(true);

      await API.put(
        `/clients/${editingClient._id}`,
        {
          callbackUrl: editCallbackUrl.trim(),
        }
      );

      setShowEditModal(false);

      setEditingClient(null);

      setEditCallbackUrl("");

      await fetchClients();

      alert("Client updated successfully");
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Failed to update client"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ENABLE / DISABLE CLIENT
  // ============================================

  const toggleStatus = async (id) => {
    try {
      await API.patch(
        `/clients/${id}/toggle-status`
      );

      fetchClients();
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Failed to update status"
      );
    }
  };

  // ============================================
  // REGENERATE API KEY
  // ============================================

  const regenerateKey = async (id) => {
    if (
      !window.confirm(
        "Regenerate API Key? Old key will stop working immediately."
      )
    ) {
      return;
    }

    try {
      const { data } = await API.patch(
        `/clients/${id}/regenerate-key`
      );

      alert(
        `New API Key:\n\n${data.apiKey}`
      );

      fetchClients();
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Failed to regenerate key"
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">

        {/* ========================================
            HEADER
        ======================================== */}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Clients Management
            </h1>

            <p className="text-slate-500 text-sm">
              Manage Vendors & API Keys
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            <MdAdd />
            Add Client
          </button>
        </div>

        {/* ========================================
            TABLE
        ======================================== */}

        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4">
                  Vendor Name
                </th>

                <th className="text-left p-4">
                  API Key
                </th>

                <th className="text-left p-4">
                  Status
                </th>

                <th className="text-left p-4">
                  Callback URL
                </th>

                <th className="text-left p-4">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="p-6 text-center text-slate-500"
                  >
                    No clients found
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client._id}
                    className="border-t"
                  >
                    {/* Vendor Name */}
                    <td className="p-4">
                      {client.vendorName}
                    </td>

                    {/* API Key */}
                    <td className="p-4 font-mono text-sm break-all">
                      {client.apiKey}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          client.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {client.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    {/* Callback URL */}
                    <td className="p-4 break-all">
                      {client.callbackUrl || "-"}
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap">

                        {/* EDIT */}
                        <button
                          onClick={() =>
                            openEditModal(client)
                          }
                          className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700"
                        >
                          <MdEdit />
                          Edit
                        </button>

                        {/* ENABLE / DISABLE */}
                        <button
                          onClick={() =>
                            toggleStatus(
                              client._id
                            )
                          }
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            client.isActive
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {client.isActive
                            ? "Disable"
                            : "Enable"}
                        </button>

                        {/* REGENERATE KEY */}
                        <button
                          onClick={() =>
                            regenerateKey(
                              client._id
                            )
                          }
                          className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700"
                        >
                          Regenerate Key
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================
            ADD CLIENT MODAL
        ======================================== */}

        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white rounded-xl p-6 w-[500px]">

              <h2 className="text-xl font-semibold mb-4">
                Add Client
              </h2>

              <div className="space-y-4">

                {/* Vendor Name */}
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) =>
                    setVendorName(
                      e.target.value
                    )
                  }
                  placeholder="Vendor Name"
                  className="w-full border rounded-lg p-3"
                />

                {/* Callback URL */}
                <input
                  type="text"
                  value={callbackUrl}
                  onChange={(e) =>
                    setCallbackUrl(
                      e.target.value
                    )
                  }
                  placeholder="Callback URL"
                  className="w-full border rounded-lg p-3"
                />

                <div className="text-sm text-slate-500">
                  API Key will be generated
                  automatically.
                </div>

              </div>

              <div className="flex justify-end gap-3 mt-6">

                <button
                  onClick={() => {
                    setShowModal(false);
                    setVendorName("");
                    setCallbackUrl("");
                  }}
                  className="border px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={saveClient}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  {loading
                    ? "Saving..."
                    : "Save Client"}
                </button>

              </div>

            </div>
          </div>
        )}

        {/* ========================================
            EDIT CLIENT MODAL
        ======================================== */}

        {showEditModal && editingClient && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white rounded-xl p-6 w-[500px]">

              <h2 className="text-xl font-semibold mb-4">
                Edit Client
              </h2>

              <div className="space-y-4">

                {/* Vendor Name - READ ONLY */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Vendor Name
                  </label>

                  <input
                    type="text"
                    value={
                      editingClient.vendorName
                    }
                    disabled
                    className="w-full border rounded-lg p-3 bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </div>

                {/* Callback URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Callback URL
                  </label>

                  <input
                    type="text"
                    value={editCallbackUrl}
                    onChange={(e) =>
                      setEditCallbackUrl(
                        e.target.value
                      )
                    }
                    placeholder="Callback URL"
                    className="w-full border rounded-lg p-3"
                  />
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    API Key
                  </label>

                  <input
                    type="text"
                    value={editingClient.apiKey}
                    disabled
                    className="w-full border rounded-lg p-3 bg-slate-100 text-slate-500 cursor-not-allowed font-mono text-sm"
                  />

                  <p className="text-xs text-slate-500 mt-1">
                    Use "Regenerate Key" to create a
                    new API key.
                  </p>
                </div>

              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">

                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingClient(null);
                    setEditCallbackUrl("");
                  }}
                  className="border px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={updateClient}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  {loading
                    ? "Updating..."
                    : "Save Changes"}
                </button>

              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

export default Clients;