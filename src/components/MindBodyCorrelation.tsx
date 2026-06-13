import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { ResponsiveContainer, Line, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Legend } from "recharts";
import type { BodySignal } from "@/lib/supabase-store";
import type { EmotionRecord } from "@/lib/store-types";

interface Props {
  allLogs: Record<string, any>;
  bodySignals: BodySignal[];
  emotionRecords: EmotionRecord[];
  sleepData: Array<{ date: string; duration: number }>;
}

function pearson(pairs: [number, number][]): number {
  const n = pairs.length;
  if (n < 5) return 0;
  const xs = pairs.map((p) => p[0]);
  const ys = pairs.map((p) => p[1]);
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  const num = pairs.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) *
    ys.reduce((s, y) => s + (y - my) ** 2, 0)
  );
  return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
}

type DayRecord = {
  date: string;
  sleep: number | null;
  energy: number | null;
  emotion: number | null;
  completion: number | null;
};

function buildDayRecord(
  dateStr: string,
  allLogs: Record<string, any>,
  bodySignals: BodySignal[],
  emotionRecords: EmotionRecord[],
  sleepData: Array<{ date: string; duration: number }>
): DayRecord {
  const sd = sleepData.find((s) => s.date === dateStr);
  const sleep = sd ? Math.round(sd.duration * 10) / 10 : null;

  const bs = bodySignals.find((b) => b.date === dateStr);
  const energy = bs ? bs.energy : null;

  const dayEmotions = emotionRecords.filter((e) => e.date === dateStr);
  const emotion =
    dayEmotions.length > 0
      ? Math.round((dayEmotions.reduce((s, e) => s + e.intensity, 0) / dayEmotions.length) * 10) / 10
      : null;

  const log = allLogs[dateStr];
  let completion: number | null = null;
  if (log) {
    const entries = Object.values(log.entries) as any[];
    const total = entries.length;
    const completed = entries.filter((e: any) => e.completed).length;
    completion = total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  return { date: dateStr, sleep, energy, emotion, completion };
}

export default function MindBodyCorrelation({ allLogs, bodySignals, emotionRecords, sleepData }: Props) {
  // Chart: last 14 days
  const chartData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = subDays(today, 13 - i);
      const dateStr = format(d, "yyyy-MM-dd");
      const label = format(d, "M/d");
      return { label, ...buildDayRecord(dateStr, allLogs, bodySignals, emotionRecords, sleepData) };
    });
  }, [allLogs, bodySignals, emotionRecords, sleepData]);

  // All available dates for correlation (full history, not just 14 days)
  const allDayData = useMemo(() => {
    const dateSet = new Set([
      ...Object.keys(allLogs),
      ...bodySignals.map((b) => b.date),
      ...emotionRecords.map((e) => e.date),
      ...sleepData.map((s) => s.date),
    ]);
    return Array.from(dateSet)
      .sort()
      .map((dateStr) => buildDayRecord(dateStr, allLogs, bodySignals, emotionRecords, sleepData));
  }, [allLogs, bodySignals, emotionRecords, sleepData]);

  const correlationInsights = useMemo(() => {
    const index: Record<string, DayRecord> = {};
    allDayData.forEach((d) => { index[d.date] = d; });

    type VKey = "sleep" | "energy" | "emotion" | "completion";

    const getPairs = (xKey: VKey, yKey: VKey, lag: number): [number, number][] =>
      allDayData.flatMap((d) => {
        let targetDate = d.date;
        if (lag > 0) {
          const [y, m, day] = d.date.split("-").map(Number);
          targetDate = format(new Date(y, m - 1, day + lag), "yyyy-MM-dd");
        }
        const target = index[targetDate];
        const x = d[xKey];
        const y = target?.[yKey] ?? null;
        return x !== null && y !== null ? [[x, y] as [number, number]] : [];
      });

    const configs = [
      {
        id: "sleep_energy", xKey: "sleep" as VKey, yKey: "energy" as VKey, lag: 0,
        label: "睡眠时长 × 精力",
        posText: "睡眠越充足，精力越旺盛",
        negText: "睡眠时长与精力呈反向关系",
      },
      {
        id: "sleep_energy_lag", xKey: "sleep" as VKey, yKey: "energy" as VKey, lag: 1,
        label: "昨晚睡眠 → 今日精力",
        posText: "昨晚睡得好，今天精力明显更足",
        negText: "昨晚睡眠影响今日精力状态",
      },
      {
        id: "energy_completion", xKey: "energy" as VKey, yKey: "completion" as VKey, lag: 0,
        label: "精力 × 打卡完成率",
        posText: "精力充沛时，当日完成率更高",
        negText: "精力与完成率呈反向关系",
      },
      {
        id: "sleep_completion", xKey: "sleep" as VKey, yKey: "completion" as VKey, lag: 0,
        label: "睡眠时长 × 完成率",
        posText: "睡眠充足时，当日完成率更高",
        negText: "睡眠时长与完成率反向变化",
      },
      {
        id: "sleep_completion_lag", xKey: "sleep" as VKey, yKey: "completion" as VKey, lag: 1,
        label: "昨晚睡眠 → 今日完成率",
        posText: "昨晚睡好，今天执行力更强",
        negText: "昨晚睡眠不足影响今日效率",
      },
      {
        id: "sleep_emotion", xKey: "sleep" as VKey, yKey: "emotion" as VKey, lag: 0,
        label: "睡眠时长 × 情绪强度",
        posText: "睡眠好时情绪激活度更高",
        negText: "睡眠减少时情绪波动更强烈",
      },
      {
        id: "energy_emotion", xKey: "energy" as VKey, yKey: "emotion" as VKey, lag: 0,
        label: "精力 × 情绪强度",
        posText: "精力与情绪激活程度同步变化",
        negText: "精力低时情绪反而更强烈",
      },
    ];

    return configs
      .map((c) => {
        const pairs = getPairs(c.xKey, c.yKey, c.lag);
        return { ...c, r: pearson(pairs), n: pairs.length };
      })
      .filter((c) => c.n >= 5 && Math.abs(c.r) >= 0.3)
      .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
      .slice(0, 3);
  }, [allDayData]);

  const hasEnoughData =
    chartData.filter((d) => d.sleep !== null || d.energy !== null || d.emotion !== null).length >= 3;

  const strengthLabel = (r: number) => {
    const a = Math.abs(r);
    if (a >= 0.7) return "强";
    if (a >= 0.5) return "中";
    return "弱";
  };

  const rColor = (r: number) =>
    r > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500";
  const barBg = (r: number) => (r > 0 ? "bg-emerald-500" : "bg-red-400");

  return (
    <div className="bg-card rounded-xl shadow-card p-4 mb-6">
      <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        🔗 身心关联
      </h2>

      {!hasEnoughData ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          再记录几天，芦苇就能帮你发现模式了 🌱
        </p>
      ) : (
        <>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} domain={[0, 12]} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 11 }}
                  formatter={(value: any, name: string) => {
                    const labels: Record<string, string> = {
                      sleep: "睡眠(h)", energy: "精力(1-5)", emotion: "情绪强度", completion: "完成率(%)",
                    };
                    return [value, labels[name] || name];
                  }}
                />
                <Legend
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      sleep: "睡眠", energy: "精力", emotion: "情绪", completion: "完成率",
                    };
                    return <span style={{ fontSize: 10 }}>{labels[value] || value}</span>;
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="sleep" stroke="hsl(239, 84%, 67%)" strokeWidth={2} dot={{ r: 2 }} connectNulls name="sleep" />
                <Line yAxisId="left" type="monotone" dataKey="energy" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 2 }} connectNulls name="energy" strokeDasharray="4 2" />
                <Line yAxisId="left" type="monotone" dataKey="emotion" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={{ r: 2 }} connectNulls name="emotion" />
                <Line yAxisId="right" type="monotone" dataKey="completion" stroke="hsl(280, 65%, 60%)" strokeWidth={2} dot={{ r: 2 }} connectNulls name="completion" strokeDasharray="6 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {correlationInsights.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-medium text-foreground mb-2.5">📊 相关性分析</p>
              <div className="space-y-2">
                {correlationInsights.map((insight) => (
                  <div key={insight.id} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-foreground">{insight.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-medium ${rColor(insight.r)}`}>
                          {strengthLabel(insight.r)}相关
                        </span>
                        <span className={`text-[10px] font-mono font-semibold ${rColor(insight.r)}`}>
                          r={insight.r > 0 ? "+" : ""}{insight.r.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full ${barBg(insight.r)}`}
                        style={{ width: `${Math.abs(insight.r) * 100}%`, opacity: 0.75 }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {insight.r > 0 ? insight.posText : insight.negText}
                      <span className="ml-1 opacity-50">· {insight.n} 天数据</span>
                    </p>
                  </div>
                ))}
            </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center mt-3">
              数据还不够多，继续记录几天就能看到相关性了 ✨
            </p>
          )}
        </>
      )}
    </div>
  );
}
