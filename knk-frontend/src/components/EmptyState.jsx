import { MdSearchOff } from "react-icons/md";

function EmptyState({ title = "No data found", message = "There's nothing to show here yet." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
        <MdSearchOff className="text-3xl text-slate-400" />
      </div>
      <div>
        <p className="font-semibold text-slate-700">{title}</p>
        <p className="text-sm text-slate-400 mt-1">{message}</p>
      </div>
    </div>
  );
}

export default EmptyState;
