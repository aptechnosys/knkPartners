const STATUS_STYLES = {
  NEW: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-green-100 text-green-700",
};

const STATUS_LABELS = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

function StatusBadge({ status, size = "sm" }) {
  const style =
    STATUS_STYLES[status] ||
    "bg-slate-100 text-slate-600";

  const label =
    STATUS_LABELS[status] || status;

  const sizeClass =
    size === "sm"
      ? "px-2.5 py-0.5 text-xs"
      : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${style} ${sizeClass}`}
    >
      {label}
    </span>
  );
}

export default StatusBadge;