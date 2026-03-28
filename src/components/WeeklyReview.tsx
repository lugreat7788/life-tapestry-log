import { useMemo } from "react";
import { format, subDays, startOfWeek, endOfWeek, isMonday } from "date-fns";
import { zhCN } from "date-fns/locale";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import type { Module } from "@/lib/modules";

interface WeeklyReviewProps {
  allLogs: Record<string, any>;
  coreModules: Module[];
  bonusModules: Module[];
}

export default function WeeklyReview({ allLogs, coreModules, bonusModules }: WeeklyReviewProps) {
  const review = useMemo(() => {
    const today = new Date();
    // Last week: Mon-Sun
    const lastMonday = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
    const lastSunday = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
    // Week before last
    const prevMonday = startOfWeek(subDays(today, 14), { weekStartsOn: 1 });
    const prevSunday = endOfWeek(subDays(today, 14), { weekStartsOn: 1 });

    const getWeekStats = (start: Date, end: Date) => {
      const days: { date: string; points: number; modules: string[] }[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = format(d, "yyyy-MM-dd");
        const log = allLogs[key];
        if (log) {
          const completedMods = [...coreModules, ...bonusModules]
            .filter((mod) => mod.items.some((item) => log.entries[item.id]?.completed))
            .map((m) => m.name);
          days.push({ date: key, points: log.totalPoints, modules: completedMods });
        }
      }
      const totalPts = days.reduce((s, d) => s + d.points, 0);
      const avgPts = days.length > 0 ? Math.round(totalPts / 7) : 0;
      const bestDay = days.length > 0 ? days.reduce((a, b) => (b.points > a.points ? b : a)) : null;
      return { days, totalPts, avgPts, bestDay, activeDays: days.length };
    };

    const lastWeek = getWeekStats(lastMonday, lastSunday);
    const prevWeek = getWeekStats(prevMonday, prevSunday);

    // Module completion counts for last week
    const modCounts: Record<string, number> = {};
    [...coreModules, ...bonusModules].forEach((mod) => {
      modCounts[mod.name] = 0;
      for (let d = new Date(lastMonday); d <= lastSunday; d.setDate(d.getDate() + 1)) {
        const key = format(d, "yyyy-MM-dd");
        const log = allLogs[key];
        if (log && mod.items.some((item) => log.entries[item.id]?.completed)) {
          modCounts[mod.name]++;
        }
      }
    });

    const bestModule = Object.entries(modCounts).sort((a, b) => b[1] - a[1])[0];
    const trend = lastWeek.avgPts - prevWeek.avgPts;

    // Generate encouragement
    let encouragement = "";
    if (bestModule && bestModule[1] > 0) {
      encouragement = `上周你有${bestModule[1]}天完成了${bestModule[0]}，`;
      if (bestModule[1] >= 5) {
        encouragement += "非常稳定，继续保持！💪";
      } else if (bestModule[1] >= 3) {
        encouragement += "表现不错，争取更多天数！";
      } else {
        encouragement += "可以尝试提高频率哦～";
      }
    } else {
      encouragement = "新的一周，从今天开始积累吧！";
    }

    return {
      lastWeek,
      prevWeek,
      trend,
      bestModule,
      encouragement,
      weekLabel: `${format(lastMonday, "M/d")} - ${format(lastSunday, "M/d")}`,
    };
  }, [allLogs, coreModules, bonusModules]);

  if (review.lastWeek.activeDays === 0 && review.prevWeek.activeDays === 0) return null;

  const TrendIcon = review.trend > 0 ? TrendingUp : review.trend < 0 ? TrendingDown : Minus;
  const trendColor = review.trend > 0 ? "text-primary" : review.trend < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/5 to-amber-500/5 rounded-2xl p-4 border border-primary/10"
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">本周复盘</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">{review.weekLabel}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-card/60 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-foreground">{review.lastWeek.avgPts}</p>
          <p className="text-[9px] text-muted-foreground">日均分</p>
        </div>
        <div className="bg-card/60 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-0.5">
            <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
            <span className={`text-lg font-bold ${trendColor}`}>
              {review.trend > 0 ? "+" : ""}{review.trend}
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground">较前周</p>
        </div>
        <div className="bg-card/60 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-foreground">{review.lastWeek.activeDays}/7</p>
          <p className="text-[9px] text-muted-foreground">活跃天</p>
        </div>
      </div>

      {review.lastWeek.bestDay && (
        <p className="text-[11px] text-muted-foreground mb-1.5">
          📊 最佳日：{format(new Date(review.lastWeek.bestDay.date), "EEEE", { locale: zhCN })}（{review.lastWeek.bestDay.points}分）
        </p>
      )}

      <p className="text-[11px] text-foreground/80 bg-card/60 rounded-lg px-3 py-2">
        💡 {review.encouragement}
      </p>
    </motion.div>
  );
}
