import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import HeroCard from "@/components/HeroCard";
import ModuleCard from "@/components/ModuleCard";
import { getDailyLog, getStreakDays, getAllTimePoints } from "@/lib/supabase-store";
import { useAuth } from "@/hooks/useAuth";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import type { DailyLog } from "@/lib/store-types";

export default function HomePage() {
  const { user } = useAuth();
  const { coreModules } = useModuleConfig();
  const [log, setLog] = useState<DailyLog>({ date: "", entries: {}, totalPoints: 0 });
  const [streakDays, setStreakDays] = useState(0);
  const [allTimePoints, setAllTimePoints] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadLog = useCallback(async () => {
    if (!user) return;
    const [data, streak, total] = await Promise.all([
      getDailyLog(user.id),
      getStreakDays(user.id),
      getAllTimePoints(user.id),
    ]);
    setLog(data);
    setStreakDays(streak);
    setAllTimePoints(total);
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

  const corePoints = coreModules.reduce(
    (sum, mod) =>
      sum + mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0),
    0
  );
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
          <h1 className="text-[15px] font-display font-semibold text-foreground">LifeLog</h1>
          <p className="text-[10px] text-muted-foreground/70 font-light mt-0.5">{today}</p>
        </div>
      </div>

      <HeroCard corePoints={corePoints} bonusPoints={bonusPoints} streakDays={streakDays} allTimePoints={allTimePoints} />

      <h2 className="text-[9px] font-medium text-muted-foreground/60 mt-3 mb-2 uppercase tracking-[0.15em]">
        每日必修
      </h2>
      <div className="grid gap-1.5">
        {coreModules.map((mod, i) => (
          <ModuleCard key={mod.key} module={mod} log={log} index={i} />
        ))}
      </div>
    </div>
  );
}
