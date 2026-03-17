import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import { MODULES } from "@/lib/modules";
import { getAllLogs, getWeekPoints, getStreakDays } from "@/lib/store";
import { Flame, TrendingUp, Target } from "lucide-react";
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

export default function StatsPage() {
  const weekPoints = getWeekPoints();
  const streak = getStreakDays();
  const allLogs = getAllLogs();

  const weekData = useMemo(() => {
    const today = new Date();
    return weekPoints.map((pts, i) => ({
      day: format(subDays(today, 6 - i), "E", { locale: zhCN }),
      points: pts,
    }));
  }, [weekPoints]);

  const totalAllTime = Object.values(allLogs).reduce(
    (sum, log) => sum + log.totalPoints,
    0
  );

  // Module completion radar
  const radarData = useMemo(() => {
    const todayLog = allLogs[format(new Date(), "yyyy-MM-dd")];
    if (!todayLog) return MODULES.map((m) => ({ module: m.name, value: 0 }));
    return MODULES.map((mod) => {
      const completed = mod.items.filter(
        (item) => todayLog.entries[item.id]?.completed
      ).length;
      return {
        module: mod.name,
        value: Math.round((completed / mod.items.length) * 100),
      };
    });
  }, [allLogs]);

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground mb-5">
        统计
      </h1>

      {/* Quick stats */}
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
          <p className="text-2xl font-display font-bold">
            {Object.keys(allLogs).length}
          </p>
          <p className="text-[10px] text-muted-foreground">记录天数</p>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="bg-card rounded-xl shadow-card p-4 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          本周积分
        </h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Bar
                dataKey="points"
                fill="hsl(239, 84%, 67%)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Radar chart */}
      <div className="bg-card rounded-xl shadow-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          今日模块完成度
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="module"
                tick={{ fontSize: 10 }}
              />
              <Radar
                dataKey="value"
                stroke="hsl(239, 84%, 67%)"
                fill="hsl(239, 84%, 67%)"
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
