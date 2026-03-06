import { AppLayout } from "@/components/AppLayout";
import { Sun, Moon, User, ArrowLeft, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, Link } from "react-router-dom";

const ProfilePage = () => {
  const { isDark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <AppLayout>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-2 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-accent transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">
            {user?.name || "User"}
          </h1>
          <p className="text-[13px] text-muted-foreground">{user?.role || "user"}</p>
        </div>
      </div>

      {/* Banner */}
      <div className="h-32 bg-secondary" />

      {/* Avatar + info */}
      <div className="px-4 pb-4">
        <div className="-mt-12 mb-3">
          <div className="h-24 w-24 rounded-full bg-background border-4 border-background flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
              <User size={36} className="text-muted-foreground" />
            </div>
          </div>
        </div>
        <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
        <p className="text-[15px] text-muted-foreground mt-0.5">{user?.email}</p>
      </div>

      {/* Settings */}
      <div className="border-t border-border">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-foreground/5 transition-colors"
        >
          <span className="flex items-center gap-3 text-[15px] text-foreground">
            {isDark ? <Moon size={20} /> : <Sun size={20} />}
            Appearance
          </span>
          <span className="text-[13px] text-muted-foreground">
            {isDark ? "Dark" : "Light"}
          </span>
        </button>

        <Link
          to="/dashboard"
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-foreground/5 transition-colors"
        >
          <span className="flex items-center gap-3 text-[15px] text-foreground">
            <LayoutDashboard size={20} />
            Dashboard
          </span>
          <span className="text-[13px] text-muted-foreground">Usage & analytics</span>
        </Link>

        <Link
          to="/moderation"
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-foreground/5 transition-colors"
        >
          <span className="flex items-center gap-3 text-[15px] text-foreground">
            <Shield size={20} />
            Moderation
          </span>
          <span className="text-[13px] text-muted-foreground">Review flagged content</span>
        </Link>

        <button
          onClick={logout}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-foreground/5 transition-colors"
        >
          <span className="flex items-center gap-3 text-[15px] text-destructive">
            <LogOut size={20} />
            Sign out
          </span>
        </button>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
