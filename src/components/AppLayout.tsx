import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, Target, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "首页" },
  { path: "/modules", icon: LayoutGrid, label: "模块" },
  { path: "/goals", icon: Target, label: "目标" },
  { path: "/stats", icon: BarChart3, label: "统计" },
  { path: "/settings", icon: Settings, label: "设置" },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom z-50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-16 h-12 rounded-lg transition-colors duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
