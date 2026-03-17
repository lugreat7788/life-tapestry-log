import { useState, useCallback } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import HeroCard from "@/components/HeroCard";
import ModuleCard from "@/components/ModuleCard";
import { CORE_MODULES, BONUS_MODULES } from "@/lib/modules";
import { getDailyLog } from "@/lib/store";

export default function HomePage() {
  const [log, setLog] = useState(() => getDailyLog());

  const handleFocus = useCallback(() => {
    setLog(getDailyLog());
  }, []);

  if (typeof window !== "undefined") {
    window.addEventListener("focus", handleFocus);
  }

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

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold text-foreground">LifeLog</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
      </div>

      <HeroCard corePoints={corePoints} bonusPoints={bonusPoints} />

      {/* Core modules */}
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

      {/* Bonus modules */}
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
