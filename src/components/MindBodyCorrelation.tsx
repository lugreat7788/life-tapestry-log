import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Legend } from "recharts";
import type { BodySignal } from "@/lib/supabase-store";
import type { EmotionRecord } from "@/lib/store-types";

interface Props {
  allLogs: Record<string, any>;
  bodySignals: BodySignal[];
  emotionRecords: EmotionRecord[];
  sleepData: Array<{ date: string; duration: number }>;
}

export default function MindBodyCorrelation({ allLogs, bodySignals, emotionRecords, sleepData }: Props) {
  const chartData = useMemo(() => {
    const today = new Date();
    const days: Array<{
      date: string;
      label: string;
      sleep: number | null;
      discomfort: number;
      emotion: number | null;
      completion: number | null;
    }> = [];

    for (let i = 13; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const label = format(d, "M/d");

      // Sleep duration
      const sd = sleepData.find((s) => s.date === dateStr);
      const sleep = sd ? Math.round(sd.duration * 10) / 10 : null;

      // Body discomfort count (non-normal signals)
      const bs = bodySignals.find((b) => b.date === dateStr);
      let discomfort = 0;
      if (bs) {
        if (bs.teeth !== "无") discomfort++;
        if (bs.eyes !== "正常") discomfort++;
        if (bs.nose !== "正常") discomfort++;
      }

      // Emotion intensity average for that day
      const dayEmotions = emotionRecords.filter((e) => e.date === dateStr);
      const emotion = dayEmotions.length > 0
        ? Math.round(dayEmotions.reduce((s, e) => s + e.intensity, 0) / dayEmotions.length * 10) / 10
        : null;

      // Daily completion %
      const log = allLogs[dateStr];
      let completion: number | null = null;
      if (log) {
        const entries = Object.values(log.entries) as any[];
        const total = entries.length;
        const completed = entries.filter((e: any) => e.completed).length;
        completion = total > 0 ? Math.round((completed / total) * 100) : 0;
      }

      days.push({ date: dateStr, label, sleep, discomfort, emotion, completion });
    }
    return days;
  }, [allLogs, bodySignals, emotionRecords, sleepData]);

  const patterns = useMemo(() => {
    const observations: string[] = [];
    const daysWithData = chartData.filter((d) => d.sleep !== null);

    if (daysWithData.length >= 7) {
      // Sleep < 7h → next day discomfort
      const lowSleepDays = daysWithData.filter((d) => d.sleep !== null && d.sleep < 7);
      if (lowSleepDays.length >= 2) {
        const nextDayDiscomforts = lowSleepDays.map((d) => {
          const idx = chartData.findIndex((c) => c.date === d.date);
          return idx < chartData.length - 1 ? chartData[idx + 1].discomfort : 0;
        });
        const avg = nextDayDiscomforts.reduce((s, v) => s + v, 0) / nextDayDiscomforts.length;
        if (avg > 0.5) {
          observations.push(`睡眠少于7小时的第二天，身体不适次数平均增加 ${avg.toFixed(1)} 次`);
        }
      }

      // High emotion → lower completion
      const highEmotionDays = chartData.filter((d) => d.emotion !== null && d.emotion >= 7);
      const normalDays = chartData.filter((d) => d.emotion !== null && d.emotion < 7 && d.completion !== null);
      if (highEmotionDays.length >= 2 && normalDays.length >= 2) {
        const highAvgCompletion = highEmotionDays.filter((d) => d.completion !== null).reduce((s, d) => s + (d.completion || 0), 0) / highEmotionDays.filter((d) => d.completion !== null).length;
        const normalAvgCompletion = normalDays.reduce((s, d) => s + (d.completion || 0), 0) / normalDays.length;
        const diff = Math.round(normalAvgCompletion - highAvgCompletion);
        if (diff > 5) {
          observations.push(`情绪强度高的当天，完成率平均下降 ${diff}%`);
        }
      }

      // Energy correlation
      const energyDays = bodySignals.filter((b) => chartData.some((c) => c.date === b.date));
      if (energyDays.length >= 3) {
        const lowEnergyDays = energyDays.filter((b) => b.energy <= 2);
        if (lowEnergyDays.length >= 2) {
          const lowCompletions = lowEnergyDays.map((b) => chartData.find((c) => c.date === b.date)?.completion).filter((c) => c !== null && c !== undefined) as number[];
          if (lowCompletions.length >= 2) {
            const avg = Math.round(lowCompletions.reduce((s, v) => s + v, 0) / lowCompletions.length);
            observations.push(`精力低于3的日子，平均完成率为 ${avg}%`);
          }
        }
      }
    }

    return observations;
  }, [chartData, bodySignals]);

  const hasEnoughData = chartData.filter((d) => d.sleep !== null || d.emotion !== null || d.discomfort > 0).length >= 3;

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
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} domain={[0, 12]} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 11 }}
                  formatter={(value: any, name: string) => {
                    const labels: Record<string, string> = { sleep: "睡眠(h)", discomfort: "不适信号", emotion: "情绪强度", completion: "完成率(%)" };
                    return [value, labels[name] || name];
                  }}
                />
                <Legend formatter={(value) => {
                  const labels: Record<string, string> = { sleep: "睡眠", discomfort: "不适", emotion: "情绪", completion: "完成率" };
                  return <span style={{ fontSize: 10 }}>{labels[value] || value}</span>;
                }} />
                <Bar yAxisId="left" dataKey="discomfort" fill="hsl(0, 72%, 51%)" opacity={0.6} radius={[3, 3, 0, 0]} name="discomfort" />
                <Line yAxisId="left" type="monotone" dataKey="sleep" stroke="hsl(239, 84%, 67%)" strokeWidth={2} dot={{ r: 2 }} connectNulls name="sleep" />
                <Line yAxisId="left" type="monotone" dataKey="emotion" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={{ r: 2 }} connectNulls name="emotion" />
                <Line yAxisId="right" type="monotone" dataKey="completion" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 2 }} connectNulls name="completion" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {patterns.length > 0 && (
            <div className="mt-4 bg-muted/50 rounded-lg p-3">
              <p className="text-xs font-medium text-foreground mb-2">🔍 观察到的模式</p>
              <ul className="space-y-1.5">
                {patterns.map((p, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="shrink-0">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {patterns.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              数据还不够多，继续记录几天就能看到模式啦 ✨
            </p>
          )}
        </>
      )}
    </div>
  );
}
