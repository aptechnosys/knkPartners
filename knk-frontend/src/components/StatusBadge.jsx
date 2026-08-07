const STATUS_STYLES = {
  NEW: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  Q_CHECK: "bg-purple-100 text-purple-700",
  DONE: "bg-green-100 text-green-700",
  INSUFFICIENT: "bg-orange-100 text-orange-700",
  ON_HOLD: "bg-yellow-100 text-yellow-700",
  STOPPED: "bg-slate-100 text-slate-600",
  REJECTED: "bg-red-100 text-red-700",
  RESOLVED: "bg-teal-100 text-teal-700",
  PENDING: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  Q_CHECK: "Q-Check",
  DONE: "Done",
  INSUFFICIENT: "Insufficient",
  ON_HOLD: "On Hold",
  STOPPED: "Stopped",
  REJECTED: "Rejected",
  RESOLVED: "Resolved",
  PENDING: "Pending",
};

function StatusBadge({ status, size = "sm" }) {
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-600";
  const label = STATUS_LABELS[status] || status;
  const sizeClass = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${style} ${sizeClass}`}>
      {label}
    </span>
  );
}

export default StatusBadge;
