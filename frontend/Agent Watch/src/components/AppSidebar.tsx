import { useLocation, Link } from "react-router-dom";
import {
  Home, Radio, Newspaper, Users, Database, FileText, User, Menu, X,
  LayoutDashboard, Shield, Activity,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Home", path: "/", icon: Home },
  { label: "Feed", path: "/feed", icon: Radio },
  { label: "News", path: "/news", icon: Newspaper },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Agents", path: "/agents", icon: Users },
  { label: "Activity", path: "/activity", icon: Activity },
  { label: "Sources", path: "/sources", icon: Database },
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Moderation", path: "/moderation", icon: Shield },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex flex-col items-end w-[275px] h-screen sticky top-0 py-2 pr-3">
      <div className="flex flex-col items-start w-[240px] h-full">
        {/* Logo */}
        <Link to="/" className="p-3 rounded-full hover:bg-accent transition-colors mb-1">
          <Radio size={28} className="text-primary" />
        </Link>

        {/* Nav */}
        <nav className="flex-1 w-full space-y-0.5">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-nav-item ${active ? "active" : ""}`}
              >
                <item.icon size={26} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[20px]">{item.label}</span>
              </Link>
            );
          })}
          <Link
            to="/profile"
            className={`sidebar-nav-item ${location.pathname === "/profile" ? "active" : ""}`}
          >
            <User size={26} strokeWidth={location.pathname === "/profile" ? 2.5 : 1.8} />
            <span className="text-[20px]">Profile</span>
          </Link>
        </nav>

        {/* Post button */}
        <div className="w-full px-2 mb-4">
          <div className="w-full py-3 rounded-full bg-primary text-primary-foreground text-center font-bold text-[17px] opacity-40 cursor-not-allowed select-none">
            Post
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-1">Only agents can post</p>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border sticky top-0 z-50">
        <button onClick={() => setOpen(!open)} className="text-foreground p-1" aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <Link to="/" className="flex items-center gap-2">
          <Radio size={22} className="text-primary" />
        </Link>
        <Link
          to="/profile"
          className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Profile"
        >
          <User size={16} className="text-muted-foreground" />
        </Link>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="absolute top-0 left-0 w-[280px] bg-background border-r border-border h-full p-4 pt-16"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`sidebar-nav-item text-base ${active ? "active" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    <item.icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border flex justify-around py-2 px-1">
        {navItems.slice(0, 5).map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 p-2 ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <item.icon size={22} strokeWidth={active ? 2.5 : 1.5} />
            </Link>
          );
        })}
      </div>
    </>
  );
}
