import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  MdMenu,
  MdNotifications,
  MdArrowForwardIos
} from "react-icons/md";

function Topbar({
  title,
  breadcrumbs = [],
  onMenuClick,
  notificationCount = 0
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const initials =
    user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : "KN";

      // Avatar URL
      const SERVER_URL = import.meta.env.VITE_API_URL.replace("/api/v1", "");

          const avatarUrl = user?.avatar
            ? `${SERVER_URL}${user.avatar}`
            : null;


  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center px-4 md:px-6 gap-4 sticky top-0 z-20">

      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="md:hidden text-slate-500 hover:text-slate-800"
      >
        <MdMenu className="text-xl" />
      </button>

      {/* Breadcrumbs */}
      <div className="flex-1 min-w-0">

        <div className="hidden md:flex items-center gap-1 text-xs text-slate-400">
          {breadcrumbs.map((crumb, i) => (
            <span
              key={i}
              className="flex items-center gap-1"
            >
              {i > 0 && (
                <MdArrowForwardIos className="text-[10px]" />
              )}

              {i === breadcrumbs.length - 1 ? (
                <span className="text-slate-600 font-medium">
                  {crumb}
                </span>
              ) : (
                <span className="hover:text-blue-600 cursor-pointer">
                  {crumb}
                </span>
              )}
            </span>
          ))}
        </div>

        <h1 className="md:hidden text-sm font-bold text-slate-900 truncate">
          {title}
        </h1>

      </div>


      {/* Right */}
      <div className="flex items-center gap-3">

        {/* Bell */}
        <button
          onClick={() => navigate("/inbox")}
          className="
          relative
          w-8 h-8
          flex items-center justify-center
          rounded-lg
          hover:bg-slate-100
          text-slate-500
          transition-colors
          "
          >
          <MdNotifications className="text-lg"/>

          {notificationCount > 0 && (
              <span className="
              absolute
              -top-1
              -right-1
              min-w-[18px]
              h-[18px]
              px-1
              bg-green-500
              text-white
              rounded-full
              text-[10px]
              flex items-center justify-center font-bold
              ">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
          )}
        </button>


        {/* User */}
        <div className="flex items-center gap-2 cursor-pointer group">

          {avatarUrl ? (
             <img
                src={avatarUrl}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          )}

          <div className="hidden md:block">

            <div className="text-xs font-semibold text-slate-900 leading-tight">
              {user?.name || user?.email?.split("@")[0] || "Admin"}
            </div>

            <div className="text-[10px] text-slate-400 capitalize">
              {user?.role || "admin"}
            </div>

          </div>

        </div>

      </div>

    </header>
  );
}

export default Topbar;