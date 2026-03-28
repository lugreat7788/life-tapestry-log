import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { MODULES, CORE_MODULES, BONUS_MODULES } from "@/lib/modules";
import { getAllLogs, getWeekPoints, getStreakDays, getSleepData, getAllTimePoints, getEmotionRecords, getRelationshipRecords, getGoals } from "@/lib/supabase-store";
import { useAuth } from "@/hooks/useAuth";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import { Flame, TrendingUp, Target, ChevronLeft, ChevronRight, Moon, Clock, Check, X, Edit2, FileText, Search, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import CheckinCard from "@/components/CheckinCard";
import EVInsightPanel from "@/components/EVInsightPanel";
import type { EmotionRecord, RelationshipRecord, GoalItem } from "@/lib/store-types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

export default function StatsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [weekPoints, setWeekPoints] = useState<number[]>([0,0,0,0,0,0,0]);
  const [streak, setStreak] = useState(0);
  const [allLogs, setAllLogs] = useState<Record<string, any>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sleepData, setSleepData] = useState<Array<{ date: string; bedtime: string; waketime: string; duration: number }>>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [radarMode, setRadarMode] = useState<"today" | "history">("today");
  const [showCheckin, setShowCheckin] = useState(false);
  const [emotionRecords, setEmotionRecords] = useState<EmotionRecord[]>([]);
  const [relationshipRecords, setRelationshipRecords] = useState<RelationshipRecord[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [allTimePoints, setAllTimePoints] = useState(0);
  const { coreModules, bonusModules } = useModuleConfig();

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getAllLogs(user.id),
      getWeekPoints(user.id),
      getStreakDays(user.id),
      getSleepData(user.id),
      getEmotionRecords(user.id),
      getRelationshipRecords(user.id),
      getGoals(user.id),
      getAllTimePoints(user.id),
    ]).then(([logs, wp, s, sd, er, rr, gl, atp]) => {
      setAllLogs(logs);
      setWeekPoints(wp);
      setStreak(s);
      setSleepData(sd);
      setEmotionRecords(er);
      setRelationshipRecords(rr);
      setGoals(gl);
      setAllTimePoints(atp);
      setLoading(false);
    });
  }, [user]);

  const weekData = useMemo(() => {
    const today = new Date();
    return weekPoints.map((pts, i) => ({
      day: format(subDays(today, 6 - i), "E", { locale: zhCN }),
      points: pts,
    }));
  }, [weekPoints]);

  const totalAllTime = Object.values(allLogs).reduce((sum: number, log: any) => sum + log.totalPoints, 0);

  // Today radar data
  const todayRadarData = useMemo(() => {
    const todayLog = allLogs[format(new Date(), "yyyy-MM-dd")];
    if (!todayLog) return MODULES.map((m) => ({ module: m.name, value: 0 }));
    return MODULES.map((mod) => {
      const completed = mod.items.filter((item) => todayLog.entries[item.id]?.completed).length;
      return { module: mod.name, value: Math.round((completed / mod.items.length) * 100) };
    });
  }, [allLogs]);

  // History radar data (average across all logged days)
  const historyRadarData = useMemo(() => {
    const logEntries = Object.values(allLogs);
    if (logEntries.length === 0) return MODULES.map((m) => ({ module: m.name, value: 0 }));
    return MODULES.map((mod) => {
      const totalPct = logEntries.reduce((sum: number, log: any) => {
        const completed = mod.items.filter((item) => log.entries[item.id]?.completed).length;
        return sum + (completed / mod.items.length) * 100;
      }, 0);
      return { module: mod.name, value: Math.round(totalPct / logEntries.length) };
    });
  }, [allLogs]);

  const radarData = radarMode === "today" ? todayRadarData : historyRadarData;

  const sleepChartData = useMemo(() => {
    return sleepData.slice(-14).map((d) => ({
      date: format(new Date(d.date), "M/d"),
      duration: Math.round(d.duration * 10) / 10,
      bedtime: d.bedtime,
      waketime: d.waketime,
    }));
  }, [sleepData]);

  const avgSleepDuration = sleepData.length > 0
    ? Math.round((sleepData.reduce((s, d) => s + d.duration, 0) / sleepData.length) * 10) / 10
    : 0;

  const avgBedtime = useMemo(() => {
    if (sleepData.length === 0) return "--:--";
    const totalMin = sleepData.reduce((s, d) => {
      const [h, m] = d.bedtime.split(":").map(Number);
      let mins = h * 60 + m;
      if (mins < 12 * 60) mins += 24 * 60;
      return s + mins;
    }, 0);
    let avg = Math.round(totalMin / sleepData.length) % (24 * 60);
    const hh = Math.floor(avg / 60) % 24;
    const mm = avg % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }, [sleepData]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: Array<{ date: string; title: string; category: string; detail: string; onClick?: () => void }> = [];
    const allModules = [...coreModules, ...bonusModules];
    
    // Search daily log entries
    Object.entries(allLogs).forEach(([date, log]: [string, any]) => {
      allModules.forEach((mod) => {
        mod.items.forEach((item) => {
          const entry = log.entries[item.id];
          if (!entry) return;
          const matchName = item.name.toLowerCase().includes(q);
          const matchNotes = entry.notes?.toLowerCase().includes(q);
          const matchModule = mod.name.toLowerCase().includes(q);
          if (matchName || matchNotes || matchModule) {
            results.push({
              date,
              title: item.name,
              category: mod.name,
              detail: entry.notes || "",
              onClick: () => { setSelectedDate(new Date(date)); setShowSearch(false); setSearchQuery(""); },
            });
          }
        });
      });
    });

    // Search emotion records
    emotionRecords.forEach((r) => {
      const match = r.emotionType.toLowerCase().includes(q) ||
        r.trigger.toLowerCase().includes(q) ||
        r.thoughts.toLowerCase().includes(q) ||
        r.copingStrategy.toLowerCase().includes(q) ||
        "情绪".includes(q);
      if (match) {
        results.push({
          date: r.date,
          title: r.emotionType,
          category: "情绪记录",
          detail: [r.trigger, r.thoughts, r.copingStrategy].filter(Boolean).join(" · "),
        });
      }
    });

    // Search relationship records
    relationshipRecords.forEach((r) => {
      const match = r.person.toLowerCase().includes(q) ||
        r.problem.toLowerCase().includes(q) ||
        r.solution.toLowerCase().includes(q) ||
        r.reflection.toLowerCase().includes(q) ||
        "关系".includes(q) || "亲密".includes(q);
      if (match) {
        results.push({
          date: r.date,
          title: `${r.person} - ${r.problem.slice(0, 20)}`,
          category: "关系记录",
          detail: [r.solution, r.reflection].filter(Boolean).join(" · "),
        });
      }
    });

    // Search goals
    goals.forEach((g) => {
      const match = g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        "目标".includes(q);
      if (match) {
        const statusMap: Record<string, string> = { not_started: "未开始", in_progress: "进行中", completed: "已完成" };
        results.push({
          date: g.createdAt.slice(0, 10),
          title: g.title,
          category: "目标追踪",
          detail: `${statusMap[g.status] || g.status} · ${g.description}`,
        });
      }
    });

    return results.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);
  }, [searchQuery, allLogs, coreModules, bonusModules, emotionRecords, relationshipRecords, goals]);

  const getCalendarCellData = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    const log = allLogs[key];
    if (!log) return { dailyHealthPts: 0, learnOutputPts: 0, bonusPts: 0, hasExercise: false, total: 0 };
    const dailyHealthPts = ["daily_record", "health"].reduce((sum, modKey) => {
      const mod = CORE_MODULES.find((m) => m.key === modKey);
      if (!mod) return sum;
      return sum + mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0);
    }, 0);
    const learnOutputPts = ["learning", "output"].reduce((sum, modKey) => {
      const mod = CORE_MODULES.find((m) => m.key === modKey);
      if (!mod) return sum;
      return sum + mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0);
    }, 0);
    const bonusPts = BONUS_MODULES.reduce((sum, mod) => sum + mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0), 0);
    const hasExercise = !!log.entries["exercise_log"]?.completed;
    return { dailyHealthPts, learnOutputPts, bonusPts, hasExercise, total: log.totalPoints };
  };

  const getBgOpacity = (pts: number) => Math.min(pts / 50, 1);
  const getBorderOpacity = (pts: number) => Math.min(pts / 30, 1);
  const getStarCount = (pts: number) => Math.min(Math.floor(pts / 10), 3);

  const handleDateClick = (day: Date) => {
    setSelectedDate((prev) => prev && isSameDay(prev, day) ? null : day);
  };

  const selectedDateLog = selectedDate ? allLogs[format(selectedDate, "yyyy-MM-dd")] : null;

  const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

  if (loading) {
    return <div className="px-4 pt-6 pb-4 max-w-lg mx-auto"><div className="animate-pulse h-8 bg-muted rounded w-32" /></div>;
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-display font-bold text-foreground">统计</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCheckin(true)}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="打卡截图"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索历史记录..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Results */}
            {searchQuery.trim() && (
              <div className="mt-2 bg-card rounded-xl shadow-card p-3 max-h-80 overflow-y-auto space-y-2">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">未找到匹配记录</p>
                ) : (
                  <>
                    <p className="text-[10px] text-muted-foreground">{searchResults.length} 条结果</p>
                    {searchResults.map((r, i) => (
                      <div
                        key={i}
                        className="border border-border rounded-lg p-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          if (r.onClick) r.onClick();
                          else { setShowSearch(false); setSearchQuery(""); }
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">{format(new Date(r.date), "yyyy年M月d日")}</span>
                          <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{r.category}</span>
                        </div>
                        <p className="text-xs font-medium text-foreground">{r.title}</p>
                        {r.detail && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{r.detail}</p>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card rounded-xl shadow-card p-4 text-center">
          <Flame className="w-5 h-5 mx-auto text-destructive mb-1" />
          <p className="text-2xl font-display font-bold">{streak}</p>
          <p className="text-[10px] text-muted-foreground">连续天数</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 text-center">
          <TrendingUp className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-display font-bold">{totalAllTime}</p>
          <p className="text-[10px] text-muted-foreground">总积分</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 text-center">
          <Target className="w-5 h-5 mx-auto text-module-goals-fg mb-1" />
          <p className="text-2xl font-display font-bold">{Object.keys(allLogs).length}</p>
          <p className="text-[10px] text-muted-foreground">记录天数</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card rounded-xl shadow-card p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 text-muted-foreground hover:text-foreground"><ChevronLeft className="w-5 h-5" /></button>
          <h2 className="text-sm font-semibold text-foreground">{format(currentMonth, "yyyy年 M月", { locale: zhCN })}</h2>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 text-muted-foreground hover:text-foreground"><ChevronRight className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => (<div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (<div key={`empty-${i}`} className="aspect-square" />))}
          {daysInMonth.map((day) => {
            const isToday = isSameDay(day, new Date());
            const cell = getCalendarCellData(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const bgAlpha = getBgOpacity(cell.dailyHealthPts);
            const borderAlpha = getBorderOpacity(cell.learnOutputPts);
            const stars = getStarCount(cell.bonusPts);
            const isDark = bgAlpha > 0.5;
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] transition-all relative overflow-hidden",
                  !cell.total && "hover:bg-muted",
                  isToday && "ring-2 ring-primary",
                  isSelected && "ring-2 ring-foreground",
                )}
                style={{
                  backgroundColor: cell.dailyHealthPts > 0 ? `hsla(152, 45%, 45%, ${bgAlpha * 0.85})` : undefined,
                  boxShadow: cell.learnOutputPts > 0 ? `inset 0 0 0 2px hsla(38, 80%, 50%, ${borderAlpha})` : undefined,
                }}
              >
                <span className={cn("font-medium leading-none", isDark ? "text-white" : "text-foreground")}>{format(day, "d")}</span>
                {stars > 0 && (
                  <span className="text-[7px] leading-none mt-0.5">
                    {"✨".repeat(stars)}
                  </span>
                )}
                {cell.hasExercise && (
                  <span className="absolute bottom-0.5 right-0.5 text-[7px] leading-none">🏃</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsla(152, 45%, 45%, 0.3)" }} />
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsla(152, 45%, 45%, 0.85)" }} />
            记录+健康
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm border-2" style={{ borderColor: "hsla(38, 80%, 50%, 0.4)" }} />
            <span className="w-3 h-3 rounded-sm border-2" style={{ borderColor: "hsla(38, 80%, 50%, 1)" }} />
            学习+输出
          </span>
          <span>✨ 成长加分</span>
          <span>🏃 有运动</span>
        </div>
      </div>

      {/* Selected Date Detail */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-card rounded-xl shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">
                  {format(selectedDate, "M月d日 EEEE", { locale: zhCN })}
                </h2>
                <button onClick={() => setSelectedDate(null)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!selectedDateLog ? (
                <p className="text-xs text-muted-foreground py-4 text-center">当天无记录</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">每日必修</p>
                    {coreModules.map((mod) => {
                      const completedItems = mod.items.filter((item) => selectedDateLog.entries[item.id]?.completed);
                      const modulePoints = completedItems.reduce((s, item) => s + item.points, 0);
                      const hasAnyEntry = mod.items.some((item) => selectedDateLog.entries[item.id]);
                      if (!hasAnyEntry && completedItems.length === 0) return null;
                      return (
                        <div key={mod.key} className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{mod.icon}</span>
                            <span className="text-xs font-medium text-foreground">{mod.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{modulePoints}分</span>
                          </div>
                          <div className="ml-6 space-y-1.5">
                            {mod.items.map((item) => {
                              const entry = selectedDateLog.entries[item.id];
                              if (!entry) return null;
                              const photos: string[] = entry.photoUrls || [];
                              const files: string[] = entry.fileUrls || [];
                              return (
                                <div key={item.id} className="space-y-1">
                                  <div className={cn("text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-0.5", entry.completed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                    {entry.completed && <Check className="w-2.5 h-2.5" />}
                                    {item.name}
                                  </div>
                                  {entry.notes && (
                                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 whitespace-pre-wrap">{entry.notes}</p>
                                  )}
                                  {photos.length > 0 && (
                                    <div className="flex gap-1.5 flex-wrap">
                                      {photos.map((url: string, i: number) => (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-border">
                                          <img src={url} alt="" className="w-full h-full object-cover" />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                  {files.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                      {files.map((url: string, i: number) => {
                                        const fileName = decodeURIComponent(url.split("/").pop() || "文件");
                                        return (
                                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-primary hover:underline bg-primary/5 rounded-lg px-2 py-1.5">
                                            <FileText className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{fileName}</span>
                                          </a>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <p className="text-[10px] text-primary uppercase tracking-wider mb-1.5">成长加分</p>
                    {bonusModules.map((mod) => {
                      const hasAnyEntry = mod.items.some((item) => selectedDateLog.entries[item.id]?.completed);
                      if (!hasAnyEntry) return null;
                      const completedItems = mod.items.filter((item) => selectedDateLog.entries[item.id]?.completed);
                      const modulePoints = completedItems.reduce((s, item) => s + item.points, 0);
                      return (
                        <div key={mod.key} className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{mod.icon}</span>
                            <span className="text-xs font-medium text-foreground">{mod.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">+{modulePoints}分</span>
                          </div>
                          <div className="ml-6 space-y-1.5">
                            {completedItems.map((item) => {
                              const entry = selectedDateLog.entries[item.id];
                              return (
                                <div key={item.id} className="space-y-1">
                                  <div className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 bg-primary/10 text-primary">
                                    <Check className="w-2.5 h-2.5" />{item.name}
                                  </div>
                                  {entry?.notes && (
                                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 whitespace-pre-wrap">{entry.notes}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {bonusModules.every((mod) => mod.items.every((item) => !selectedDateLog.entries[item.id]?.completed)) && (
                      <p className="text-[10px] text-muted-foreground ml-6">无加分项</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs font-medium text-foreground">当日总分</span>
                    <span className="text-sm font-bold text-primary">{selectedDateLog.totalPoints}分</span>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 rounded-full"
                onClick={() => navigate(`/stats/date/${format(selectedDate, "yyyy-MM-dd")}`)}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                修改记录
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sleep Stats — moved below calendar */}
      {sleepData.length > 0 && (
        <div className="bg-card rounded-xl shadow-card p-4 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Moon className="w-4 h-4 text-primary" />
            睡眠统计
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-display font-bold">{avgSleepDuration}h</p>
              <p className="text-[10px] text-muted-foreground">平均睡眠时长</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Moon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-display font-bold">{avgBedtime}</p>
              <p className="text-[10px] text-muted-foreground">平均入睡时间</p>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sleepChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 12]} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} unit="h" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }}
                  formatter={(value: number) => [`${value}小时`, "睡眠时长"]}
                  labelFormatter={(label) => `日期: ${label}`}
                />
                <Line type="monotone" dataKey="duration" stroke="hsl(239, 84%, 67%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(239, 84%, 67%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
            {sleepData.slice(0, 7).map((d) => (
              <div key={d.date} className="flex items-center justify-between text-xs px-1">
                <span className="text-muted-foreground">{format(new Date(d.date), "M月d日")}</span>
                <span className="text-muted-foreground">{d.bedtime} → {d.waketime}</span>
                <span className={cn("font-medium", d.duration >= 7 ? "text-primary" : d.duration >= 6 ? "text-foreground" : "text-destructive")}>
                  {Math.floor(d.duration)}h{Math.round((d.duration % 1) * 60) > 0 ? `${Math.round((d.duration % 1) * 60)}m` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-card p-4 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">本周积分</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              <Bar dataKey="points" fill="hsl(239, 84%, 67%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Module Completion Radar — with today/history toggle */}
      <div className="bg-card rounded-xl shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">模块完成度</h2>
          <div className="flex bg-muted rounded-full p-0.5">
            <button
              onClick={() => setRadarMode("today")}
              className={cn(
                "text-[10px] px-3 py-1 rounded-full transition-colors font-medium",
                radarMode === "today" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              今日
            </button>
            <button
              onClick={() => setRadarMode("history")}
              className={cn(
                "text-[10px] px-3 py-1 rounded-full transition-colors font-medium",
                radarMode === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              历史均值
            </button>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid strokeDasharray="3 3" />
              <PolarAngleAxis dataKey="module" tick={{ fontSize: 10 }} />
              <Radar dataKey="value" stroke="hsl(239, 84%, 67%)" fill="hsl(239, 84%, 67%)" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Checkin Screenshot Card */}
      <AnimatePresence>
        {showCheckin && (
          <CheckinCard
            log={allLogs[format(new Date(), "yyyy-MM-dd")] || { date: format(new Date(), "yyyy-MM-dd"), entries: {}, totalPoints: 0 }}
            coreModules={coreModules}
            bonusModules={bonusModules}
            streakDays={streak}
            allTimePoints={allTimePoints}
            onClose={() => setShowCheckin(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
