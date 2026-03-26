import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, Heart, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "必修" },
  { path: "/modules", icon: LayoutGrid, label: "加分" },
  { path: "/goals", icon: Heart, label: "心灵" },
  { path: "/stats", icon: BarChart3, label: "统计" },
  { path: "/settings", icon: Settings, label: "设置" },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 pb-[4.5rem] overflow-y-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card/85 glass border-t border-border/40 safe-bottom z-50">
        <div className="flex items-center justify-around h-[3.25rem] max-w-lg mx-auto px-3">
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
                  "flex flex-col items-center justify-center gap-[2px] w-14 h-10 rounded-xl transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/70 hover:text-foreground/80"
                )}
              >
                <item.icon className={cn("w-[18px] h-[18px] transition-all", isActive ? "stroke-[2.2]" : "stroke-[1.6]")} />
                <span className="text-[9px] font-medium tracking-wider">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
