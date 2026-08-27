import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function DashboardLayout({
  children,
  title = "Dashboard",
  breadcrumbs = ["Home", "Dashboard"],
  notificationCount = 0,
  apiInboxCount = 0,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        apiInboxCount={apiInboxCount}
      />

      <div className="flex-1 md:ml-[240px] flex flex-col min-h-screen min-w-0">

        <Topbar
          title={title}
          breadcrumbs={breadcrumbs}
          onMenuClick={() => setMobileOpen(true)}
          notificationCount={notificationCount}
        />

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>

      </div>
    </div>
  );
}

export default DashboardLayout;