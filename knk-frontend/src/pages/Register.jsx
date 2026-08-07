import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import { MdSecurity } from "react-icons/md";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", role: "agent" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post("/auth/register", form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <MdSecurity className="text-white text-3xl" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-blue-200 text-sm mt-1">KNK Admin Panel</p>
        </div>
        <div className="px-8 py-8">
          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-sm transition-all mt-2">
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>
          <p className="text-center text-sm text-slate-400 mt-4">
            Already have an account? <Link to="/" className="text-blue-600 font-medium hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
