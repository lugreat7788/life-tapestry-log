import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Module } from "@/lib/modules";
import { cn } from "@/lib/utils";

interface EVInsightPanelProps {
  allLogs: Record<string, any>;
  modules: Module[];
}

export default function EVInsightPanel({ allLogs, modules }: EVInsightPanelProps) {
  const insights = useMemo(() => {
    const logDays = Object.values(allLogs);
    if (logDays.length < 3) return null;

    const itemStats: Record<string, { name: string; module: string; completions: number; total: number }> = {};

    modules.forEach((mod) => {
      mod.items.forEach((item) => {
        const completions = logDays.filter((log: any) => log.entries[item.id]?.completed).length;
        itemStats[item.id] = {
          name: item.name,
          module: mod.name,
          completions,
          total: logDays.length,
        };
      });
    });

    const sorted = Object.values(itemStats).sort((a, b) => (b.completions / b.total) - (a.completions / a.total));
    const top3 = sorted.slice(0, 3);
    const bottom3 = sorted.filter((s) => s.total > 0).slice(-3).reverse();

    const bestItem = top3[0];
    const worstItem = bottom3[0];

    let insight = "";
    if (bestItem && worstItem) {
      const bestPct = Math.round((bestItem.completions / bestItem.total) * 100);
      const worstPct = Math.round((worstItem.completions / worstItem.total) * 100);
      insight = `你坚持最好的是「${bestItem.name}」(${bestPct}%)，最容易跳过的是「${worstItem.name}」(${worstPct}%)`;
    }

    return { top3, bottom3, insight };
  }, [allLogs, modules]);

  if (!insights) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl shadow-card p-4 mb-6"
    >
      <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        高价值行为
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-primary font-medium uppercase tracking-wider mb-2">坚持最好</p>
          <div className="space-y-1.5">
            {insights.top3.map((item, i) => {
              const pct = Math.round((item.completions / item.total) * 100);
              return (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-3">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-foreground truncate">{item.name}</p>
                    <div className="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-primary font-medium">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[10px] text-destructive font-medium uppercase tracking-wider mb-2">最常跳过</p>
          <div className="space-y-1.5">
            {insights.bottom3.map((item, i) => {
              const pct = Math.round((item.completions / item.total) * 100);
              return (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-3">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-foreground truncate">{item.name}</p>
                    <div className="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                      <div className="h-full rounded-full bg-destructive/50" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {insights.insight && (
        <p className="text-[11px] text-foreground/80 bg-muted/50 rounded-lg px-3 py-2">
          💡 {insights.insight}
        </p>
      )}
    </motion.div>
  );
}
