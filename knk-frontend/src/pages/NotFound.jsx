import { useNavigate } from "react-router-dom";
function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-8xl font-bold text-blue-600">404</p>
        <p className="text-xl font-semibold text-slate-800 mt-3">Page Not Found</p>
        <p className="text-slate-400 mt-2">The page you're looking for doesn't exist.</p>
        <button onClick={() => navigate("/dashboard")} className="mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
export default NotFound;
