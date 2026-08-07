import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import API from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import { MdArrowBack, MdSave, MdRefresh, MdPerson, MdWarning } from "react-icons/md";

const STATUSES = ["NEW", "IN_PROGRESS", "Q_CHECK", "DONE", "INSUFFICIENT", "ON_HOLD", "STOPPED", "REJECTED"];

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}

function FormInput({ label, value, onChange, type = "text", readOnly = false, placeholder = "" }) {
  return (
    <div>
      {label && <label className="block text-xs text-slate-500 mb-1">{label}</label>}
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${readOnly ? "bg-slate-50 text-slate-600" : "bg-white"}`}
      />
    </div>
  );
}

function getTATLeft(createdAt, tat) {
  if (!tat) return null;
  const days = parseInt(tat);
  if (isNaN(days)) return null;
  const deadline = new Date(new Date(createdAt).getTime() + days * 86400000);
  return Math.ceil((deadline - new Date()) / 86400000);
}

export default function CaseDetails() {
  const { id } = useParams();
  // const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [queryText, setQueryText] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [verificationResult,setVerificationResult,] = useState("");
  const [verificationRemark,setVerificationRemark,] = useState("");
  const [proofFile, setProofFile] = useState(null);

  // Form state
  const [form, setForm] = useState({
    candidate_name: "", father_name: "", candidate_dob: "", doj: "",
    employee_id: "", phone: "", email: "", street_address: "",
    city: "", state: "", country: "", pincode: "",
    residence_type: "", vendor: "", remark: "", internal_notes: ""
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCaseDetails = async () => {
    try {
      const res = await API.get(`/cases/${id}`);
      const d = res.data.data;
      setCaseData(d);
      setStatus(d.check_status || "NEW");
      setAssignedTo(
        d.assignedTo?._id || d.assignedTo || ""
      );
      setForm({
        candidate_name: d.candidate_name || "",
        father_name: d.father_name || "",
        candidate_dob: d.candidate_dob ? new Date(d.candidate_dob).toISOString().split("T")[0] : "",
        doj: d.doj || "",
        employee_id: d.employee_id || "",
        phone: d.phone || "",
        email: d.email || "",
        street_address: d.street_address || "",
        city: d.city || "",
        state: d.state || "",
        country: d.country || "India",
        pincode: d.pincode || "",
        residence_type: d.residence_type || "",
        vendor: d.vendor || "",
        remark: d.remark || "",
        internal_notes: d.internal_notes || "",
      });

      setVerificationResult(
          res.data.data.verification_result || ""
        );

        setVerificationRemark(
          res.data.data.verification_remark || ""
        );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get("/auth/users");
      setUsers(res.data.data || []);
    } catch { /* silently fail */ }
  };

    useEffect(() => {
    fetchCaseDetails();

    if (isAdmin) {
      fetchUsers();
    }

  }, [id, isAdmin]);

  const updateStatus = async () => {
    setStatusSaving(true);
    try {
      await API.put(`/cases/${id}/status`, { check_status: status });
      showToast("Status updated successfully");
      fetchCaseDetails();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status", "error");
    } finally {
      setStatusSaving(false);
    }
  };

  const assignCase = async () => {
    if (!assignedTo) return showToast("Please select an employee", "error");
    setAssignSaving(true);
    try {
      await API.patch(`/cases/${id}/assign`, { assignedTo });
      showToast("Case assigned successfully");
      fetchCaseDetails();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to assign", "error");
    } finally {
      setAssignSaving(false);
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await API.put(`/cases/${id}`, form);
      showToast("Changes saved successfully");
      fetchCaseDetails();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    if (caseData) {
      setForm({
        candidate_name: caseData.candidate_name || "",
        father_name: caseData.father_name || "",
        candidate_dob: caseData.candidate_dob ? new Date(caseData.candidate_dob).toISOString().split("T")[0] : "",
        doj: caseData.doj || "",
        employee_id: caseData.employee_id || "",
        phone: caseData.phone || "",
        email: caseData.email || "",
        street_address: caseData.street_address || "",
        city: caseData.city || "",
        state: caseData.state || "",
        country: caseData.country || "India",
        pincode: caseData.pincode || "",
        residence_type: caseData.residence_type || "",
        vendor: caseData.vendor || "",
        remark: caseData.remark || "",
        internal_notes: caseData.internal_notes || "",
      });
    }
  };

  if (loading) return (
    <DashboardLayout title="Case Details" breadcrumbs={["Home", "Cases", "Details"]}>
      <LoadingSpinner text="Loading case details..." />
    </DashboardLayout>
  );

  if (!caseData) return (
    <DashboardLayout title="Case Details">
      <div className="text-center py-16 text-slate-400">Case not found.</div>
    </DashboardLayout>
  );

  const tatLeft = getTATLeft(caseData.createdAt, caseData.tat);
  const isOverdue = tatLeft !== null && tatLeft < 0;

  const assignedUserId =
  caseData?.assignedTo?._id ||
  caseData?.assignedTo;

  const canUpdateStatus =
    isAdmin || assignedUserId === user?.id;

const saveVerification =
  async () => {
    try {

      await API.patch(
        `/cases/${id}/verify`,
        {
          verification_result:
            verificationResult,

          verification_remark:
            verificationRemark,
        }
      );

      alert(
        "Verification saved successfully"
      );

      fetchCaseDetails();

    } catch (err) {

      console.log(err);

      alert(
        "Failed to save verification"
      );

    }
  };

  const uploadProof =
  async () => {

    if (!proofFile) {
      alert(
        "Please select a file"
      );
      return;
    }

    try {

      const formData =
        new FormData();

      formData.append(
        "proof",
        proofFile
      );

      const res =
        await API.patch(
          `/cases/${id}/upload-proof`,
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      alert(
        "Proof uploaded successfully"
      );

      fetchCaseDetails();

    } catch (err) {

      console.log(err);

      alert(
        "Upload failed"
      );

    }
  };

  return (
    <DashboardLayout title="Case Details" breadcrumbs={["Home", "Cases", caseData.comp_ref_no]}>
      <div className="space-y-5">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all ${toast.type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>
            {toast.msg}
          </div>
        )}

        {/* Top Header Bar */}
        <div className="bg-white rounded-xl border border-slate-100 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-slate-900 text-base font-mono">{caseData.comp_ref_no}</span>
            <StatusBadge status={caseData.check_status} size="md" />
            {tatLeft !== null && (
              <span className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? "text-red-600" : "text-green-600"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOverdue ? "bg-red-500" : "bg-green-500"}`}></span>
                {isOverdue ? `${Math.abs(tatLeft)} day(s) overdue` : `${tatLeft} day(s) left`}
              </span>
            )}
          </div>
          <button onClick={() => navigate("/cases")}
            className="flex items-center gap-1.5 border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <MdArrowBack className="text-base" /> Back
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* LEFT: Candidate Info + Processing Form */}
          <div className="xl:col-span-2 space-y-5">

            {/* A. Candidate Information */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">A. Candidate Information</p>
                <span className="flex items-center gap-1 bg-blue-50 text-blue-600 text-[10px] font-medium px-2 py-1 rounded-full">
                  🔒 Source: Client API
                </span>
              </div>
              <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-5">
                <InfoRow label="Full Name" value={caseData.candidate_name} />
                <InfoRow label="Address" value={caseData.street_address} />
                <InfoRow label="Father Name" value={caseData.father_name} />
                <InfoRow label="City / State" value={[caseData.city, caseData.state].filter(Boolean).join(" / ")} />
                <InfoRow label="Date of Birth" value={caseData.candidate_dob ? new Date(caseData.candidate_dob).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
                <InfoRow label="Pin Code" value={caseData.pincode} />
                <InfoRow label="Vendor" value={caseData.vendor} />
                <InfoRow label="Remark" value={caseData.remark} />
              </div>
            </div>

            {/* B. Internal Processing */}
            {isAdmin && (
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">B. Internal Processing</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Candidate Name" value={form.candidate_name} onChange={e => setForm({...form, candidate_name: e.target.value})} />
                  <FormInput label="Father Name" value={form.father_name} onChange={e => setForm({...form, father_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormInput label="Date of Birth" type="date" value={form.candidate_dob} onChange={e => setForm({...form, candidate_dob: e.target.value})} />
                  <FormInput label="Date of Joining" type="date" value={form.doj} onChange={e => setForm({...form, doj: e.target.value})} />
                  <FormInput label="Employee ID" value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 XXXXX XXXXX" />
                  <FormInput label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <FormInput label="Street Address" value={form.street_address} onChange={e => setForm({...form, street_address: e.target.value})} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormInput label="City" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                  <FormInput label="State" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
                  <FormInput label="Country" value={form.country} onChange={e => setForm({...form, country: e.target.value})} />
                  <FormInput label="Pin Code" value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Residence Type" value={form.residence_type} onChange={e => setForm({...form, residence_type: e.target.value})} placeholder="e.g. Owned / Rented" />
                  <FormInput label="Vendor" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Remark (from API)</label>
                  <textarea value={form.remark} onChange={e => setForm({...form, remark: e.target.value})} rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Internal Notes</label>
                  <textarea value={form.internal_notes} onChange={e => setForm({...form, internal_notes: e.target.value})} rows={3}
                    placeholder="Internal notes (not sent to client)"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={resetForm}
                    className="flex items-center gap-1.5 border border-slate-200 px-5 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    <MdRefresh className="text-base" /> Reset
                  </button>
                  <button onClick={saveChanges} disabled={saving}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                    <MdSave className="text-base" />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* C. Verification Details */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                C. Verification Details
              </p>
            </div>

            <div className="p-5 space-y-4">

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Verification Result
                </label>
              <select
                value={verificationResult}
                onChange={(e) =>
                  setVerificationResult(
                    e.target.value
                  )
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              >
                  <option value="">
                    Select Result
                  </option>

                  <option value="GREEN">
                    GREEN
                  </option>

                  <option value="RED">
                    RED
                  </option>

                  <option value="ORANGE">
                    ORANGE
                  </option>

                  <option value="INSUFFICIENT">
                    INSUFFICIENT
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Verification Remark
                </label>

               <textarea
                    value={verificationRemark}
                    onChange={(e) =>
                      setVerificationRemark(
                        e.target.value
                      )
                    }
                  placeholder="Enter verification remarks..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Proof Document
                </label>

               <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    setProofFile(
                      e.target.files[0]
                    )
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />

                <div className="mt-3">
                <button
                  onClick={uploadProof}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Upload Proof
                </button>
              </div>
              </div>

              <button
                onClick={
                  saveVerification
                }
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
              >
                Save Verification
              </button>

            </div>
          </div>

          {caseData?.verified_by && (
            <div className="bg-slate-50 border rounded-lg p-3 text-sm">
              <p>
                <strong>Verified By:</strong>{" "}
                {caseData?.verified_by?.email || "-"}
              </p>

              <p>
                <strong>Verified Date:</strong>{" "}
                {caseData?.verified_date
                  ? new Date(
                      caseData.verified_date
                    ).toLocaleString()
                  : "-"}
              </p>
            </div>
          )}

          {caseData?.proof_document && (
          <div className="mt-3">

            <a
              href={`${import.meta.env.VITE_SERVER_URL}${caseData.proof_document}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center bg-slate-800 text-white px-4 py-2 rounded-lg"
            >
              View Proof
            </a>

          </div>
        )}

          </div>
          

          {/* RIGHT: Control Cards */}
          <div className="space-y-4">

            {/* Status Control */}
            
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Status Control</p>
              <div className="mb-3">
                <p className="text-xs text-slate-400 mb-1.5">Current Status</p>
                <StatusBadge status={caseData.check_status} size="md" />
              </div>
              <div className="mb-3">
                <p className="text-xs text-slate-400 mb-1.5">Move to Status</p>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select next status...</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
              <button
                onClick={updateStatus}
                disabled={!canUpdateStatus || statusSaving || !status}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                → {statusSaving ? "Updating..." : "Update Status"}
              </button>
            </div>
            

            {/* Assign Case */}
            {isAdmin && (
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Assign Case</p>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mb-3">
                <option value="">Select employee...</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.email}</option>)}
              </select>
              <button onClick={assignCase} disabled={assignSaving || !assignedTo}
                className="w-full border border-blue-500 text-blue-600 hover:bg-blue-50 disabled:opacity-60 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                <MdPerson className="text-base" />
                {assignSaving ? "Assigning..." : "Assign Case"}
              </button>
            </div>
            )}

            {/* Insufficient Data */}
            {isAdmin && (
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Insufficient Data</p>
              <textarea value={queryText} onChange={e => setQueryText(e.target.value)} rows={4}
                placeholder="Describe missing information or query for the client..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3" />
              <button
              onClick={async () => {
                try {

                  if (!queryText.trim()) {
                    return alert("Enter query first");
                  }

                  await API.patch(
                    `/cases/${id}/query`,
                    {
                      query: queryText,
                    }
                  );

                  alert(
                    "Query raised successfully"
                  );

                  setCaseData(prev => ({
                  ...prev,
                  check_status: "INSUFFICIENT",
                  insufficient_query: queryText,
                }));
                window.location.reload();

                  setQueryText("");

                } catch (error) {
                  console.log(error);

                  alert(
                    error?.response?.data?.message ||
                    "Failed to raise query"
                  );
                }
              }}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <MdWarning className="text-base" />
              Raise Query to Client
            </button>
            </div>
            )}

            {/* Case Info */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Case Info</p>
              <div className="space-y-3">
                {[
                  { label: "App ID", value: caseData.comp_ref_no },
                  { label: "TAT", value: caseData.tat ? `${caseData.tat} days` : "—" },
                  { label: "Listed At", value: caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                  { label: "Ext. Status", value: "PENDING" },
                  { label: "Callback", value: caseData.callback_url ? "Sent" : "Not sent" },
                  { label: "Created", value: caseData.createdAt ? new Date(caseData.createdAt).toLocaleString("en-IN") : "—" },
                  { label: "Updated", value: caseData.updatedAt ? new Date(caseData.updatedAt).toLocaleString("en-IN") : "—" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-start gap-2">
                    <span className="text-xs text-slate-400 shrink-0">{item.label}</span>
                    <span className={`text-xs font-medium text-right ${item.label === "App ID" ? "font-mono text-slate-700" : item.label === "Ext. Status" ? "text-amber-600" : "text-slate-700"}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
