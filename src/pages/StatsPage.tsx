import { useState, useMemo, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { MODULES, CORE_MODULES, BONUS_MODULES } from "@/lib/modules";
import { getAllLogs, getWeekPoints, getStreakDays } from "@/lib/supabase-store";
import { useAuth } from "@/hooks/useAuth";
import { Flame, TrendingUp, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
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
} from "recharts";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export default function StatsPage() {
  const { user } = useAuth();
  const [weekPoints, setWeekPoints] = useState<number[]>([0,0,0,0,0,0,0]);
  const [streak, setStreak] = useState(0);
  const [allLogs, setAllLogs] = useState<Record<string, any>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getAllLogs(user.id), getWeekPoints(user.id), getStreakDays(user.id)]).then(([logs, wp, s]) => {
      setAllLogs(logs);
      setWeekPoints(wp);
      setStreak(s);
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

  const selectedDetail = useMemo(() => {
    if (!selectedDate) return null;
    const scores = getScoreForDate(selectedDate);
    const key = format(selectedDate, "yyyy-MM-dd");
    const log = allLogs[key];
    const completedItems: Array<{ moduleName: string; moduleIcon: string; itemName: string; points: number; notes: string }> = [];
    if (log) {
      MODULES.forEach((mod) => {
        mod.items.forEach((item) => {
          const entry = log.entries[item.id];
          if (entry?.completed) {
            completedItems.push({ moduleName: mod.name, moduleIcon: mod.icon, itemName: item.name, points: item.points, notes: entry.notes || "" });
          }
        });
      });
    }
    return { scores, completedItems, date: selectedDate };
  }, [selectedDate, allLogs]);

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
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const scores = getScoreForDate(day);
            return (
              <button key={day.toISOString()} onClick={() => setSelectedDate(day)} className={cn("aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative", level > 0 ? LEVEL_COLORS[level] : "hover:bg-muted", isToday && "ring-2 ring-primary", isSelected && "ring-2 ring-foreground")}>
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

      <Drawer open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{selectedDate && format(selectedDate, "yyyy年M月d日 EEEE", { locale: zhCN })}</DrawerTitle>
          </DrawerHeader>
          {selectedDetail && (
            <div className="px-4 pb-8 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-display font-bold text-primary">{selectedDetail.scores.core}</p>
                  <p className="text-[10px] text-muted-foreground">核心分 /100</p>
                </div>
                <div className="bg-module-goals rounded-lg p-3 text-center">
                  <p className="text-lg font-display font-bold text-module-goals-fg">+{selectedDetail.scores.bonus}</p>
                  <p className="text-[10px] text-muted-foreground">加分</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-lg font-display font-bold text-foreground">{selectedDetail.scores.total}</p>
                  <p className="text-[10px] text-muted-foreground">总分</p>
                </div>
              </div>
              {selectedDetail.completedItems.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">当天没有完成记录</p>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">完成项目 ({selectedDetail.completedItems.length})</h3>
                  {selectedDetail.completedItems.map((item, idx) => (
                    <div key={idx} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{item.moduleIcon}</span>
                          <span className="text-sm font-medium">{item.itemName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">+{item.points}分</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.moduleName}</p>
                      {item.notes && <p className="text-xs text-muted-foreground mt-1 border-t border-border pt-1">{item.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
