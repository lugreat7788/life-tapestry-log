import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import HeroCard from "@/components/HeroCard";
import ModuleCard from "@/components/ModuleCard";
import { StreakRiskBanner, MilestoneBadge } from "@/components/CelebrationAnimation";
import WeeklyReview from "@/components/WeeklyReview";
import { useAuth } from "@/hooks/useAuth";
import { useDataCache } from "@/hooks/useDataCache";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import { CORE_MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { coreModules, bonusModules } = useModuleConfig();
  const cache = useDataCache();
  const [log, setLog] = useState<DailyLog>({ date: "", entries: {}, totalPoints: 0 });
  const [streakDays, setStreakDays] = useState(0);
  const [allTimePoints, setAllTimePoints] = useState(0);
  const [allLogs, setAllLogs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showMilestone, setShowMilestone] = useState<number | null>(null);
  const [lowEnergyMode] = useState(() => localStorage.getItem("lifelog_low_energy") === "true");
  const [bonusExpanded, setBonusExpanded] = useState(false);

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

  // Low energy mode: filter to 3 items only
  const LOW_ENERGY_ITEMS = ["sleep_log", "body_signal", "daily_summary"];
  const displayCoreModules = lowEnergyMode
    ? coreModules.map((mod) => ({
        ...mod,
        items: mod.items
          .filter((item) => LOW_ENERGY_ITEMS.includes(item.id))
          .map((item) => ({
            ...item,
            points: item.id === "sleep_log" ? 40 : item.id === "body_signal" ? 30 : 30,
          })),
      })).filter((mod) => mod.items.length > 0)
    : coreModules;

  const corePoints = displayCoreModules.reduce(
    (sum, mod) =>
      sum + mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0),
    0
  );
  const bonusPoints = lowEnergyMode ? 0 : bonusModules.reduce(
    (sum, mod) =>
      sum + mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0),
    0
  );
  const coreMax = lowEnergyMode ? 100 : displayCoreModules.reduce((sum, mod) => sum + mod.items.reduce((s, i) => s + i.points, 0), 0);

  const totalCoreItems = displayCoreModules.reduce((s, m) => s + m.items.length, 0);
  const completedCoreItems = displayCoreModules.reduce(
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

      <h2 className="text-[9px] font-medium text-muted-foreground/60 mt-3 mb-2 uppercase tracking-[0.15em]">
        {lowEnergyMode ? "🔋 低能量模式 · 只需完成这些" : "每日必修"}
      </h2>
      <div className="grid gap-1.5">
        {displayCoreModules.map((mod, i) => (
          <ModuleCard key={mod.key} module={mod} log={log} index={i} />
        ))}
      </div>

      {!lowEnergyMode && bonusModules.length > 0 && (
        <div className="mt-3 rounded-2xl bg-card shadow-card overflow-hidden">
          <button
            onClick={() => setBonusExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <span className="text-[13px] font-display font-medium text-foreground">加分</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-light tabular-nums">+{bonusPoints}</span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  bonusExpanded && "rotate-180"
                )}
              />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {bonusExpanded && (
              <motion.div
                key="bonus-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-2.5 px-4 pb-3">
                  {bonusModules.map((mod, i) => {
                    const earned = mod.items.reduce(
                      (s, item) => s + (log.entries[item.id]?.completed ? item.points : 0),
                      0
                    );
                    return (
                      <motion.div
                        key={mod.key}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.3 }}
                        className="rounded-2xl bg-background shadow-card p-3.5"
                      >
                        <button
                          onClick={() => navigate(`/modules/${mod.key}`)}
                          className="flex items-center gap-3 w-full text-left mb-2.5"
                        >
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-base", mod.bgClass)}>
                            {mod.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-medium text-[13px] text-foreground">{mod.name}</h3>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-light tabular-nums">+{earned}</span>
                        </button>
                        <div className="grid grid-cols-2 gap-1.5">
                          {mod.items.map((item) => {
                            const done = log.entries[item.id]?.completed;
                            return (
                              <button
                                key={item.id}
                                onClick={() => navigate(`/modules/${mod.key}`)}
                                className={cn(
                                  "flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-left transition-all text-[11px]",
                                  done
                                    ? "bg-primary/8 text-primary"
                                    : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
                                )}
                              >
                                <div className={cn(
                                  "w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors",
                                  done ? "bg-primary border-primary" : "border-muted-foreground/25"
                                )}>
                                  {done && <Check className="w-2 h-2 text-primary-foreground" />}
                                </div>
                                <span className="truncate">{item.name}</span>
                                <span className="ml-auto text-[9px] opacity-40 tabular-nums">+{item.points}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
