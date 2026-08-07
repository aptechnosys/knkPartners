import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  MdDashboard,
  MdInbox,
  MdFolder,
  MdFilterList,
  MdApi,
  MdBarChart,
  MdHistory,
  MdGroup,
  MdSettings,
  MdPerson,
  MdLogout,
  MdSecurity,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdBusiness,
  MdArchive,
  MdCloudUpload
} from "react-icons/md";

const NAV = [
  {
    section: "MAIN",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: MdDashboard },
      { label: "API Requests Inbox", path: "/inbox", icon: MdInbox, badge: "apiInbox" },
    ]

    
    },
 {
  section: "CASES",
  items: [
    {
      label: "All Cases",
      path: "/cases",
      icon: MdFolder,
    },

    {
      label: "Bulk Upload",
      path: "/bulk-upload",
      icon: MdCloudUpload,
    },

    {
      label: "Archived Cases",
      path: "/archived-cases",
      icon: MdArchive,
    },

    {
      label: "By Status",
      path: "/cases/by-status",
      icon: MdFilterList,
      hasChildren: true,
      children: [
        { label: "New", path: "/cases?status=NEW" },
        { label: "In Progress", path: "/cases?status=IN_PROGRESS" },
        { label: "Pending", path: "/cases?status=PENDING" },
        { label: "Q-Check", path: "/cases?status=Q_CHECK" },
        { label: "Done", path: "/cases?status=DONE" },
        { label: "Insufficient", path: "/cases?status=INSUFFICIENT" },
        { label: "On Hold", path: "/cases?status=ON_HOLD" },
        { label: "Stopped", path: "/cases?status=STOPPED" },
        { label: "Rejected", path: "/cases?status=REJECTED" },
      ],
    },
  ],
},

    {
    section: "ADMIN",
    items: [
      {
        label: "Clients",
        path: "/Clients",
        icon: MdBusiness
      },
    ]
  },
  {
    section: "OPERATIONS",
    items: [
      { label: "API Logs", path: "/api-logs", icon: MdApi },
      { label: "Reports", path: "/reports", icon: MdBarChart },
      { label: "Audit Log", path: "/audit-log", icon: MdHistory },
    ]
  },
  {
    section: "ACCOUNT",
    items: [
      { label: "My Profile", path: "/profile", icon: MdPerson },
    ]
  },
];

function NavItem({ item, collapsed, apiInboxCount }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isActive = location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
  const Icon = item.icon;

  if (item.hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
            isActive ? "bg-blue-50 text-blue-600 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Icon className="text-lg shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {open ? <MdKeyboardArrowUp className="text-sm" /> : <MdKeyboardArrowDown className="text-sm" />}
            </>
          )}
        </button>
        {open && !collapsed && (
          <div className="ml-9 mt-1 space-y-0.5">
            {item.children.map(child => (
              <Link key={child.path} to={child.path}
                className="block px-3 py-2 text-xs text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all">
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link to={item.path}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative ${
        isActive ? "bg-blue-50 text-blue-600 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-600 rounded-r-full" />}
      <Icon className="text-lg shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
       {item.label === "API Requests Inbox"  &&
      apiInboxCount > 0 && (
        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
          {apiInboxCount}
        </span>
      )}
        </>
      )}
    </Link>
  );
}

function Sidebar({ mobileOpen, onClose, apiInboxCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

    const role = user?.role;

const filteredNAV = NAV.map(group => ({
  ...group,
  items: group.items.filter(item => {

    if (
      role !== "admin" &&
      [
        "API Requests Inbox",
        "API Logs",
        "Reports",
        "Audit Log",
        "Users & Agents",
        "Settings",
        "Clients"
      ].includes(item.label)
    ) {
      return false;
    }

    return true;
  })
}));

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "KN";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <MdSecurity className="text-white text-lg" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm leading-tight">KNK PARTNERS</div>
            <div className="text-[10px] text-slate-400">Court Case Panel</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
        {filteredNAV.map(group => (
          <div key={group.section}>
            <p className="text-[10px] font-semibold text-slate-400 tracking-widest px-3 mb-2">{group.section}</p>
            <div className="space-y-0.5">
              {group.items.map(item => <NavItem key={item.path} item={item} apiInboxCount={apiInboxCount} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-900 truncate">{user?.name || user?.email || "Admin"}</div>
            <div className="text-[10px] text-slate-400 capitalize">{user?.role || "admin"}</div>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="Logout">
            <MdLogout className="text-lg" />
          </button>
        </div>
        <p className="text-[10px] text-slate-300 text-center mt-3">© 2026 KNK PARTNERS</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] bg-white border-r border-slate-100 h-screen fixed left-0 top-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
          <aside className="fixed left-0 top-0 h-full w-[240px] bg-white z-50 md:hidden shadow-2xl">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}

export default Sidebar;
