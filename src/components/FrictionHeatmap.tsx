import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, BarChart3 } from "lucide-react";
import type { Module } from "@/lib/modules";
import { cn } from "@/lib/utils";

interface FrictionHeatmapProps {
  allLogs: Record<string, any>;
  coreModules: Module[];
  bonusModules: Module[];
  skipReasons: Array<{ item_id: string; reason: string; date: string }>;
}

interface ItemFriction {
  itemId: string;
  itemName: string;
  moduleName: string;
  completionRate: number;
  avgSkipStreak: number;
  maxSkipStreak: number;
  topReasons: Array<{ reason: string; count: number }>;
  totalDays: number;
  completedDays: number;
}

export default function FrictionHeatmap({ allLogs, coreModules, bonusModules, skipReasons }: FrictionHeatmapProps) {
  const allModules = [...coreModules, ...bonusModules];

  const frictionData = useMemo(() => {
    const logDates = Object.keys(allLogs).sort();
    if (logDates.length === 0) return [];

    const items: ItemFriction[] = [];

    for (const mod of allModules) {
      for (const item of mod.items) {
        let completed = 0;
        let skipStreaks: number[] = [];
        let currentStreak = 0;

        for (const date of logDates) {
          const log = allLogs[date];
          if (log.entries[item.id]?.completed) {
            completed++;
            if (currentStreak > 0) {
              skipStreaks.push(currentStreak);
              currentStreak = 0;
            }
          } else {
            currentStreak++;
          }
        }
        if (currentStreak > 0) skipStreaks.push(currentStreak);

        const completionRate = logDates.length > 0 ? Math.round((completed / logDates.length) * 100) : 0;
        const avgSkipStreak = skipStreaks.length > 0 ? Math.round((skipStreaks.reduce((a, b) => a + b, 0) / skipStreaks.length) * 10) / 10 : 0;
        const maxSkipStreak = skipStreaks.length > 0 ? Math.max(...skipStreaks) : 0;

        // Count skip reasons for this item
        const reasonCounts: Record<string, number> = {};
        skipReasons
          .filter((r) => r.item_id === item.id)
          .forEach((r) => {
            reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
          });
        const topReasons = Object.entries(reasonCounts)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 2);

        items.push({
          itemId: item.id,
          itemName: item.name,
          moduleName: mod.name,
          completionRate,
          avgSkipStreak,
          maxSkipStreak,
          topReasons,
          totalDays: logDates.length,
          completedDays: completed,
        });
      }
    }

    return items.sort((a, b) => a.completionRate - b.completionRate);
  }, [allLogs, allModules, skipReasons]);

  if (frictionData.length === 0) return null;

  const needsAttention = frictionData.filter((d) => d.completionRate < 50).slice(0, 3);
  const reasonLabels: Record<string, string> = {
    no_time: "没时间",
    forgot: "忘了",
    bad_mood: "状态不好",
    dont_know: "不知道写什么",
    skip: "跳过",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl shadow-card p-4 mb-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">习惯摩擦分析</h2>
      </div>

      {/* Needs attention items */}
      {needsAttention.length > 0 && (
        <div className="mb-4 p-3 bg-destructive/5 border border-destructive/10 rounded-lg">
          <p className="text-[11px] font-medium text-destructive flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            需要关注的习惯
          </p>
          <div className="space-y-1.5">
            {needsAttention.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between text-[11px]">
                <span className="text-foreground font-medium">{item.itemName}</span>
                <span className="text-destructive">{item.completionRate}% 完成率</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full friction table */}
      <div className="space-y-2">
        {frictionData.map((item) => {
          const isLow = item.completionRate < 30;
          const isMedium = item.completionRate >= 30 && item.completionRate < 60;
          return (
            <div
              key={item.itemId}
              className={cn(
                "border rounded-lg p-2.5 transition-colors",
                isLow ? "border-destructive/20 bg-destructive/5" :
                isMedium ? "border-amber-500/20 bg-amber-500/5" :
                "border-border"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{item.itemName}</span>
                  <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.moduleName}</span>
                </div>
                <span className={cn(
                  "text-xs font-semibold",
                  isLow ? "text-destructive" : isMedium ? "text-amber-600" : "text-primary"
                )}>
                  {item.completionRate}%
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>完成 {item.completedDays}/{item.totalDays} 天</span>
                {item.avgSkipStreak > 0 && (
                  <span className="flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" />
                    均跳 {item.avgSkipStreak} 天
                  </span>
                )}
                {item.maxSkipStreak > 1 && (
                  <span>最长跳 {item.maxSkipStreak} 天</span>
                )}
              </div>
              {item.topReasons.length > 0 && (
                <div className="flex gap-1.5 mt-1.5">
                  {item.topReasons.map((r) => (
                    <span key={r.reason} className="text-[9px] bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {reasonLabels[r.reason] || r.reason} ×{r.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
