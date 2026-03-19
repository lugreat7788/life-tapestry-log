import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import HeroCard from "@/components/HeroCard";
import ModuleCard from "@/components/ModuleCard";
import { CORE_MODULES, BONUS_MODULES } from "@/lib/modules";
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
  const bonusPoints = calcPoints(BONUS_MODULES);

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-32" />
          <div className="h-40 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold text-foreground">LifeLog</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
      </div>

      <HeroCard corePoints={corePoints} bonusPoints={bonusPoints} />

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          📋 每日必修
        </h2>
        <div className="grid gap-3">
          {CORE_MODULES.map((mod, i) => (
            <ModuleCard key={mod.key} module={mod} log={log} index={i} />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-amber-600 mb-3 uppercase tracking-wider">
          ⭐ 成长加分
        </h2>
        <div className="grid gap-3">
          {BONUS_MODULES.map((mod, i) => (
            <ModuleCard key={mod.key} module={mod} log={log} index={i} showBonus />
          ))}
        </div>
      </div>
    </div>
  );
}
