import { useState, useCallback } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import HeroCard from "@/components/HeroCard";
import ModuleCard from "@/components/ModuleCard";
import { MODULES } from "@/lib/modules";
import { getDailyLog } from "@/lib/store";

export default function HomePage() {
  const [log, setLog] = useState(() => getDailyLog());

  // Refresh on focus
  const handleFocus = useCallback(() => {
    setLog(getDailyLog());
  }, []);

  // Listen for visibility changes to refresh data
  if (typeof window !== "undefined") {
    window.addEventListener("focus", handleFocus);
  }

  const today = format(new Date(), "M月d日 EEEE", { locale: zhCN });

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      {/* Date header */}
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold text-foreground">
          LifeLog
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
      </div>

      {/* Hero score card */}
      <HeroCard totalPoints={log.totalPoints} />

      {/* Module progress cards */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          模块进度
        </h2>
        <div className="grid gap-3">
          {MODULES.map((mod, i) => (
            <ModuleCard key={mod.key} module={mod} log={log} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
