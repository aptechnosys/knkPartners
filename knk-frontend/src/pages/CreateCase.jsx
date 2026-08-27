import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import API from "../api/axios";
import { MdSave, MdArrowBack } from "react-icons/md";

export default function CreateCase() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    comp_ref_no: "", candidate_name: "", father_name: "", candidate_dob: "",
    street_address: "", city: "", state: "", pincode: "", vendor: "", tat: "", remark: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await API.post("/cases", form);
      navigate("/cases");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create case");
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="block text-xs text-slate-500 mb-1.5">{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  return (
    <DashboardLayout title="Create Case" breadcrumbs={["Home", "Cases", "Create"]}>
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/cases")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-2 rounded-lg transition-colors">
            <MdArrowBack /> Back
          </button>
          <h1 className="text-xl font-bold text-slate-900">Create New Case</h1>
        </div>
        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field("Reference Number *", "comp_ref_no", "text", "REF-2026-001001")}
            {field("Candidate Name", "candidate_name")}
            {field("Father Name", "father_name")}
            {field("Date of Birth", "candidate_dob", "date")}
            {field("City", "city")}
            {field("State", "state")}
            {field("Pin Code", "pincode")}
            {field("Vendor", "vendor")}
            {field("TAT (days)", "tat", "text", "5")}
          </div>
          {field("Street Address", "street_address")}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Remark</label>
            <textarea value={form.remark} onChange={e => setForm({...form, remark: e.target.value})} rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <MdSave /> {saving ? "Creating..." : "Create Case"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
