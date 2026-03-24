import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import HeroCard from "@/components/HeroCard";
import ModuleCard from "@/components/ModuleCard";
import { CORE_MODULES } from "@/lib/modules";
import { getDailyLog } from "@/lib/supabase-store";
import { useAuth } from "@/hooks/useAuth";
import type { DailyLog } from "@/lib/store-types";

export default function HomePage() {
  const { user } = useAuth();
  const [log, setLog] = useState<DailyLog>({ date: "", entries: {}, totalPoints: 0 });
  const [loading, setLoading] = useState(true);

  const loadLog = useCallback(async () => {
    if (!user) return;
    const data = await getDailyLog(user.id);
    setLog(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  useEffect(() => {
    const handleFocus = () => loadLog();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadLog]);

  const today = format(new Date(), "M月d日 EEEE", { locale: zhCN });

  const calcPoints = (modules: typeof CORE_MODULES) =>
    modules.reduce(
      (sum, mod) =>
        sum +
        mod.items.reduce(
          (s, item) => s + (log.entries[item.id]?.completed ? item.points : 0),
          0
        ),
      0
    );

  const corePoints = calcPoints(CORE_MODULES);
  const bonusPoints = 0;

  if (loading) {
    return (
      <div className="px-5 pt-8 pb-4 max-w-lg mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-7 bg-muted rounded-lg w-28" />
          <div className="h-44 bg-muted rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-display font-semibold text-foreground tracking-tight">LifeLog</h1>
          <p className="text-[11px] text-muted-foreground font-light">{today}</p>
        </div>
      </div>

      <HeroCard corePoints={corePoints} bonusPoints={bonusPoints} />

      <h2 className="text-[10px] font-medium text-muted-foreground mt-3 mb-2 uppercase tracking-widest">
        每日必修
      </h2>
      <div className="grid gap-1.5">
        {CORE_MODULES.map((mod, i) => (
          <ModuleCard key={mod.key} module={mod} log={log} index={i} />
        ))}
      </div>

    </div>
  );
}
