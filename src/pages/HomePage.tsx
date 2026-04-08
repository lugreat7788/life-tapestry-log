import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { AnimatePresence } from "framer-motion";
import HeroCard from "@/components/HeroCard";
import ModuleCard from "@/components/ModuleCard";
import { StreakRiskBanner, MilestoneBadge } from "@/components/CelebrationAnimation";
import WeeklyReview from "@/components/WeeklyReview";
import InsightReview from "@/components/InsightReview";
import { useAuth } from "@/hooks/useAuth";
import { useDataCache } from "@/hooks/useDataCache";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import { CORE_MODULES } from "@/lib/modules";
import type { DailyLog } from "@/lib/store-types";

const MILESTONE_KEY = "lifelog_milestone_shown";

function getShownMilestones(): number[] {
  try {
    return JSON.parse(localStorage.getItem(MILESTONE_KEY) || "[]");
  } catch { return []; }
}

function markMilestoneShown(days: number) {
  const shown = getShownMilestones();
  if (!shown.includes(days)) {
    shown.push(days);
    localStorage.setItem(MILESTONE_KEY, JSON.stringify(shown));
  }
}

export default function HomePage() {
  const { user } = useAuth();
  const { coreModules, bonusModules } = useModuleConfig();
  const cache = useDataCache();
  const [log, setLog] = useState<DailyLog>({ date: "", entries: {}, totalPoints: 0 });
  const [streakDays, setStreakDays] = useState(0);
  const [allTimePoints, setAllTimePoints] = useState(0);
  const [allLogs, setAllLogs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showMilestone, setShowMilestone] = useState<number | null>(null);

  const loadLog = useCallback(async () => {
    if (!user) return;
    const result = await cache.loadHomeData();
    setLog(result.log);
    setStreakDays(result.streak);
    setAllTimePoints(result.allTimePoints);
    setAllLogs(result.allLogs);
    setLoading(false);

    // Check milestones
    const milestones = [7, 30, 100];
    const shown = getShownMilestones();
    for (const m of milestones) {
      if (result.streak >= m && !shown.includes(m)) {
        setShowMilestone(m);
        break;
      }
    }
  }, [user, cache]);

  // Sync from cache when optimistic updates happen
  useEffect(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const cachedLog = cache.dailyLogs[todayStr];
    if (cachedLog) {
      setLog(cachedLog);
    }
  }, [cache.dailyLogs]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  useEffect(() => {
    const handleFocus = () => {
      // On refocus, invalidate and reload
      cache.invalidateAll();
      loadLog();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadLog, cache]);

  const today = format(new Date(), "M月d日 EEEE", { locale: zhCN });

  const corePoints = coreModules.reduce(
    (sum, mod) =>
      sum + mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0),
    0
  );
  const bonusPoints = bonusModules.reduce(
    (sum, mod) =>
      sum + mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0),
    0
  );
  const coreMax = coreModules.reduce((sum, mod) => sum + mod.items.reduce((s, i) => s + i.points, 0), 0);

  const totalCoreItems = coreModules.reduce((s, m) => s + m.items.length, 0);
  const completedCoreItems = coreModules.reduce(
    (s, m) => s + m.items.filter((item) => log.entries[item.id]?.completed).length, 0
  );
  const unfinishedCount = totalCoreItems - completedCoreItems;

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

      <AnimatePresence>
        {showMilestone && (
          <div className="mb-3">
            <MilestoneBadge
              days={showMilestone}
              onClose={() => {
                markMilestoneShown(showMilestone);
                setShowMilestone(null);
              }}
            />
          </div>
        )}
      </AnimatePresence>

      <StreakRiskBanner streak={streakDays} todayScore={log.totalPoints} unfinishedCount={unfinishedCount} />

      <HeroCard corePoints={corePoints} bonusPoints={bonusPoints} streakDays={streakDays} allTimePoints={allTimePoints} coreMax={coreMax} />

      {Object.keys(allLogs).length >= 3 && (
        <div className="mt-3">
          <WeeklyReview allLogs={allLogs} coreModules={coreModules} bonusModules={bonusModules} />
        </div>
      )}

      <div className="mt-3">
        <InsightReview log={log} coreModules={coreModules} bonusModules={bonusModules} />
      </div>

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
