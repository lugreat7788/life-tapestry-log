import { useState, useCallback } from "react";
import { format, subDays } from "date-fns";
import { BookOpen, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getEmotionRecords, getGoals, getSleepData } from "@/lib/supabase-store";
import { useAuth } from "@/hooks/useAuth";
import type { Module } from "@/lib/modules";

interface WeeklyInsightProps {
  allLogs: Record<string, any>;
  coreModules: Module[];
  bonusModules: Module[];
}

const CACHE_KEY = "lifelog_weekly_insight_v1";

function getCached(weekKey: string): string | null {
  try {
    const store = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return store[weekKey] ?? null;
  } catch {
    return null;
  }
}

function setCache(weekKey: string, text: string) {
  try {
    const store = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    const sorted = Object.keys(store).sort();
    while (sorted.length >= 4) delete store[sorted.shift()!];
    store[weekKey] = text;
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {}
}

function buildWeeklyPrompt(
  allLogs: Record<string, any>,
  coreModules: Module[],
  bonusModules: Module[],
  emotionSummary: string,
  goalSummary: string,
  sleepSummary: string
): string {
  const today = new Date();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(format(subDays(today, i), "yyyy-MM-dd"));
  }

  const allModules = [...coreModules, ...bonusModules];
  const dailySummaries: string[] = [];

  for (const date of days) {
    const log = allLogs[date];
    if (!log) {
      dailySummaries.push(`${date}：未记录`);
      continue;
    }

    const parts: string[] = [`${date}（${log.totalPoints}分）`];

    // Module completion
    for (const mod of allModules) {
      const completed = mod.items.filter((item: any) => log.entries[item.id]?.completed).length;
      if (completed > 0) {
        const notes = mod.items
          .filter((item: any) => log.entries[item.id]?.notes)
          .map((item: any) => `${item.name}:${log.entries[item.id].notes}`)
          .join("；");
        parts.push(`  ${mod.name}：${completed}/${mod.items.length}完成${notes ? `（${notes}）` : ""}`);
      }
    }

    // Journal
    const summary = log.entries["daily_summary"]?.notes;
    const reflection = log.entries["deep_reflection"]?.notes;
    if (summary) parts.push(`  日记：${summary}`);
    if (reflection) parts.push(`  觉察：${reflection}`);

    dailySummaries.push(parts.join("\n"));
  }

  const lines = [
    `以下是我过去一周（${days[0]} 至 ${days[6]}）的生活记录：`,
    "",
    "【每日记录】",
    dailySummaries.join("\n\n"),
    "",
    "【本周睡眠概况】",
    sleepSummary || "无数据",
    "",
    "【本周情绪记录】",
    emotionSummary || "无记录",
    "",
    "【目标进展】",
    goalSummary || "无记录",
    "",
    "请按格式给出本周回顾总结。",
  ];

  return lines.join("\n");
}

function InsightContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-[12px] leading-relaxed text-foreground/85">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) {
          return (
            <p key={i} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-1 first:mt-0">
              {line.replace("### ", "")}
            </p>
          );
        }
        if (line.startsWith("▸ ")) {
          const parts = line.replace("▸ ", "").split(" — ");
          return (
            <p key={i} className="flex gap-1.5">
              <span className="text-primary shrink-0 mt-px">▸</span>
              <span>
                {parts[0]}
                {parts[1] && <span className="text-muted-foreground"> — {parts[1]}</span>}
              </span>
            </p>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <p key={i} className="pl-2 border-l-2 border-primary/30 py-0.5">
              {line.replace("- ", "")}
            </p>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export default function WeeklyInsight({ allLogs, coreModules, bonusModules }: WeeklyInsightProps) {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(subDays(new Date(), 6), "yyyy-MM-dd");
  const weekKey = `${weekStart}_${today}`;

  const [review, setReview] = useState<string | null>(() => getCached(weekKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (force = false) => {
      if (!user || loading) return;

      const cached = getCached(weekKey);
      if (cached && !force) {
        setReview(cached);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [emotionRecords, goals, sleepData] = await Promise.all([
          getEmotionRecords(user.id),
          getGoals(user.id),
          getSleepData(user.id),
        ]);

        // Filter to this week
        const weekDates = new Set<string>();
        for (let i = 6; i >= 0; i--) {
          weekDates.add(format(subDays(new Date(), i), "yyyy-MM-dd"));
        }

        const weekEmotions = emotionRecords.filter((r) => weekDates.has(r.date));
        const emotionSummary = weekEmotions.length > 0
          ? weekEmotions
              .map((r) => `${r.date} ${r.person}·${r.emotionType}(${r.intensity})${r.trigger ? ` 触发:${r.trigger}` : ""}${r.reflection ? ` 反思:${r.reflection}` : ""}`)
              .join("\n")
          : "";

        const goalSummary = goals.length > 0
          ? goals.map((g) => {
              const statusMap: Record<string, string> = { not_started: "未开始", in_progress: "进行中", completed: "已完成" };
              return `${g.title}（${statusMap[g.status] ?? g.status}）`;
            }).join("；")
          : "";

        const weekSleep = sleepData.filter((d) => weekDates.has(d.date));
        const sleepSummary = weekSleep.length > 0
          ? `${weekSleep.length}天有记录，平均时长${(weekSleep.reduce((s, d) => s + d.duration, 0) / weekSleep.length).toFixed(1)}小时\n` +
            weekSleep.map((d) => `${d.date} ${d.bedtime}-${d.waketime} ${d.duration.toFixed(1)}h`).join("\n")
          : "";

        const prompt = buildWeeklyPrompt(allLogs, coreModules, bonusModules, emotionSummary, goalSummary, sleepSummary);

        const { data, error: fnError } = await supabase.functions.invoke("weekly-review", {
          body: { prompt },
        });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);
        if (!data?.review) throw new Error("未收到回复");

        setReview(data.review);
        setCache(weekKey, data.review);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "生成失败，请稍后重试";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [user, allLogs, coreModules, bonusModules, weekKey, loading]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-2xl border border-orange-500/10 overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <BookOpen className="w-4 h-4 text-orange-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">芦苇 · 每周回顾</h3>
          <p className="text-[10px] text-muted-foreground/70">{weekStart} ~ {today}</p>
        </div>
        {!loading && (
          <button
            onClick={() => generate(!!review)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-orange-600 bg-orange-500/10 hover:bg-orange-500/20 transition-colors rounded-lg px-2.5 py-1.5"
          >
            {review ? (
              <>
                <RefreshCw className="w-3 h-3" />
                重新生成
              </>
            ) : (
              <>
                <BookOpen className="w-3 h-3" />
                生成回顾
              </>
            )}
          </button>
        )}
        {loading && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            分析中…
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pb-4 text-[11px] text-destructive">
            {error}
          </motion.div>
        )}

        {!review && !loading && !error && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pb-4 text-[11px] text-muted-foreground/60">
            点击「生成回顾」，芦苇将整合你过去7天的所有记录，给出趋势分析和行动建议。
          </motion.div>
        )}

        {review && !loading && (
          <motion.div key="review" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 pb-4">
            <InsightContent text={review} />
          </motion.div>
        )}

        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pb-4 space-y-2">
            {[60, 80, 50, 70, 45, 65, 55].map((w, i) => (
              <div key={i} className="h-2.5 bg-muted/60 rounded animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
