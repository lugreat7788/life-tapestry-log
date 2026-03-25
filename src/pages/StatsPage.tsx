import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { MODULES, CORE_MODULES, BONUS_MODULES } from "@/lib/modules";
import { getAllLogs, getWeekPoints, getStreakDays, getSleepData } from "@/lib/supabase-store";
import { useAuth } from "@/hooks/useAuth";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import { Flame, TrendingUp, Target, ChevronLeft, ChevronRight, Moon, Clock, Check, X, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
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
  const { coreModules, bonusModules } = useModuleConfig();

  useEffect(() => {
    if (!user) return;
    Promise.all([getAllLogs(user.id), getWeekPoints(user.id), getStreakDays(user.id), getSleepData(user.id)]).then(([logs, wp, s, sd]) => {
      setAllLogs(logs);
      setWeekPoints(wp);
      setStreak(s);
      setSleepData(sd);
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

  const radarData = useMemo(() => {
    const todayLog = allLogs[format(new Date(), "yyyy-MM-dd")];
    if (!todayLog) return MODULES.map((m) => ({ module: m.name, value: 0 }));
    return MODULES.map((mod) => {
      const completed = mod.items.filter((item) => todayLog.entries[item.id]?.completed).length;
      return { module: mod.name, value: Math.round((completed / mod.items.length) * 100) };
    });
  }, [allLogs]);

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

  const getScoreForDate = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    const log = allLogs[key];
    if (!log) return { core: 0, bonus: 0, total: 0 };
    const core = CORE_MODULES.reduce((sum, mod) => sum + mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0), 0);
    const bonus = BONUS_MODULES.reduce((sum, mod) => sum + mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0), 0);
    return { core, bonus, total: log.totalPoints };
  };

  const getCompletionLevel = (date: Date): number => {
    const { core } = getScoreForDate(date);
    if (core === 0) return 0;
    if (core < 30) return 1;
    if (core < 60) return 2;
    if (core < 100) return 3;
    return 4;
  };

  const LEVEL_COLORS = ["", "bg-primary/20", "bg-primary/40", "bg-primary/60", "bg-primary/90"];

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
      <h1 className="text-2xl font-display font-bold text-foreground mb-5">统计</h1>

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

      {/* Sleep Stats */}
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
            const level = getCompletionLevel(day);
            const isToday = isSameDay(day, new Date());
            const scores = getScoreForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            return (
              <button key={day.toISOString()} onClick={() => handleDateClick(day)} className={cn("aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative", level > 0 ? LEVEL_COLORS[level] : "hover:bg-muted", isToday && "ring-2 ring-primary", isSelected && "ring-2 ring-foreground")}>
                <span className={cn("font-medium", level >= 3 ? "text-primary-foreground" : "text-foreground")}>{format(day, "d")}</span>
                {scores.total > 0 && <span className={cn("text-[8px] leading-none", level >= 3 ? "text-primary-foreground/70" : "text-muted-foreground")}>{scores.total}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-[10px] text-muted-foreground">少</span>
          {[1, 2, 3, 4].map((l) => (<div key={l} className={cn("w-3 h-3 rounded-sm", LEVEL_COLORS[l])} />))}
          <span className="text-[10px] text-muted-foreground">多</span>
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
                  {/* Core modules */}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">每日必修</p>
                    {coreModules.map((mod) => {
                      const completedItems = mod.items.filter((item) => selectedDateLog.entries[item.id]?.completed);
                      const modulePoints = completedItems.reduce((s, item) => s + item.points, 0);
                      return (
                        <div key={mod.key} className="mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{mod.icon}</span>
                            <span className="text-xs font-medium text-foreground">{mod.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{modulePoints}分</span>
                          </div>
                          <div className="flex flex-wrap gap-1 ml-6">
                            {mod.items.map((item) => {
                              const completed = selectedDateLog.entries[item.id]?.completed;
                              const notes = selectedDateLog.entries[item.id]?.notes;
                              return (
                                <div key={item.id} className={cn("text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5", completed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                  {completed && <Check className="w-2.5 h-2.5" />}
                                  {item.name}
                                  {notes && <span className="text-muted-foreground/60 ml-0.5">📝</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bonus modules */}
                  <div>
                    <p className="text-[10px] text-primary uppercase tracking-wider mb-1.5">成长加分</p>
                    {bonusModules.map((mod) => {
                      const completedItems = mod.items.filter((item) => selectedDateLog.entries[item.id]?.completed);
                      if (completedItems.length === 0) return null;
                      const modulePoints = completedItems.reduce((s, item) => s + item.points, 0);
                      return (
                        <div key={mod.key} className="mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{mod.icon}</span>
                            <span className="text-xs font-medium text-foreground">{mod.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">+{modulePoints}分</span>
                          </div>
                          <div className="flex flex-wrap gap-1 ml-6">
                            {completedItems.map((item) => (
                              <div key={item.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" />{item.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {bonusModules.every((mod) => mod.items.every((item) => !selectedDateLog.entries[item.id]?.completed)) && (
                      <p className="text-[10px] text-muted-foreground ml-6">无加分项</p>
                    )}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs font-medium text-foreground">当日总分</span>
                    <span className="text-sm font-bold text-primary">{selectedDateLog.totalPoints}分</span>
                  </div>
                </div>
              )}

              {/* Edit button */}
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

      <div className="bg-card rounded-xl shadow-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">今日模块完成度</h2>
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
    </div>
  );
}
