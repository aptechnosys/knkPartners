import { Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Cases from "../pages/Cases";
import CaseDetails from "../pages/CaseDetails";
import CreateCase from "../pages/CreateCase";
import ApiInbox from "../pages/ApiInbox";
import NotFound from "../pages/NotFound";
import ApiLogs from "../pages/ApiLogs";
import Reports from "../pages/Reports";
import AuditLog from "../pages/AuditLog";
import Users from "../pages/Users";
import Settings from "../pages/Settings";
import Profile from "../pages/Profile";
import ProtectedRoute from "./ProtectedRoute";
import Clients from "../pages/Clients";
import ArchivedCases from "../pages/ArchivedCases";
import BulkUpload from "../pages/BulkUpload";


function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/cases" element={<ProtectedRoute><Cases /></ProtectedRoute>} />
      <Route path="/cases/:id" element={<ProtectedRoute><CaseDetails /></ProtectedRoute>} />
      <Route path="/create-case" element={<ProtectedRoute><CreateCase /></ProtectedRoute>} />
      <Route path="/inbox" element={<ProtectedRoute><ApiInbox /></ProtectedRoute>} />
      <Route path="/api-logs" element={<ProtectedRoute><ApiLogs /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/api-inbox" element={<ProtectedRoute><ApiInbox /></ProtectedRoute>} />
      <Route path="/bulk-upload" element={<ProtectedRoute><BulkUpload /></ProtectedRoute>} />
      <Route path="/archived-cases" element={<ProtectedRoute><ArchivedCases /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
