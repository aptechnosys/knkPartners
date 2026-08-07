import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { FiMail, FiLock, FiLoader, FiAlertCircle } from "react-icons/fi";
import { MdSecurity } from "react-icons/md";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

 const handleSubmit = async (e) => {
  e.preventDefault();

  setLoading(true);
  setError("");

  try {
    const res = await API.post("/auth/login", formData);

    // save token
    localStorage.setItem(
      "token",

      res.data.token
    );

    // save full user object including role
    localStorage.setItem(
      "user",
      JSON.stringify(res.data.user)
    );

    // existing auth function
    login(
      res.data.token,
      res.data.user
    );

    navigate("/dashboard");

  }  catch (err) {

  if (!err.response) {
    setError(
      "Unable to connect to the server. Please try again."
    );
  } else {
    const status = err.response.status;

    switch (status) {
      case 401:
        setError("Invalid email or password.");
        break;

      case 429:
        setError(
          err.response.data.message ||
          "Too many failed login attempts. Please try again after 15 minutes."
        );
        break;

      case 500:
        setError("Internal server error. Please try again later.");
        break;

      default:
        setError(
          err.response.data?.message ||
          "Something went wrong."
        );
    }
  }

} finally {
  setLoading(false);
}
 };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <MdSecurity className="text-white text-3xl" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">KNK Admin Panel</h1>
            <p className="text-blue-200 text-sm mt-1">Criminal Court Verification System</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <p className="text-slate-500 text-sm mb-6 text-center">Sign in to your account to continue</p>

            {error && (
              <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                <FiAlertCircle className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter Your Email"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-200"
              >
                {loading ? (
                  <>
                    <FiLoader className="animate-spin" />
                    Signing in...
                  </>
                ) : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          © 2026 KNK Admin Panel — Criminal Court Check System
        </p>
      </div>
    </div>
  );
}

export default Login;
