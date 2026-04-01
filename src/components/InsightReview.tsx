import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getEmotionRecords, getGoals } from "@/lib/supabase-store";
import { useAuth } from "@/hooks/useAuth";
import type { DailyLog } from "@/lib/store-types";
import type { Module } from "@/lib/modules";

interface InsightReviewProps {
  log: DailyLog;
  coreModules: Module[];
  bonusModules: Module[];
}

// ─── LocalStorage cache (keyed by date) ───

const CACHE_KEY = "lifelog_insight_v1";

function getCached(date: string): string | null {
  try {
    const store = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return store[date] ?? null;
  } catch {
    return null;
  }
}

function setCache(date: string, insight: string) {
  try {
    const store = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    // Keep only last 7 days to avoid bloat
    const sorted = Object.keys(store).sort();
    while (sorted.length >= 7) {
      delete store[sorted.shift()!];
    }
    store[date] = insight;
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage errors
  }
}

// ─── DeepSeek system prompt ───

const DEEPSEEK_SYSTEM_PROMPT = `你是"芦苇"——一位苏格拉底式的个人成长引导者。

你的核心任务是：基于用户今日的生活记录，先用反问式问题引发深度自我洞察，再给出具体可行的成长建议。

## 角色定位

- 你不是评判者，也不是鼓励机器
- 你是一面镜子：用问题帮用户看见自己看不见的盲点
- 你是一位智者：在用户充分自我审视后，给出真诚、直接的建议

## 输出结构（严格按此格式）

### 一、苏格拉底式追问（3个问题）

选择今日记录中最值得深挖的3个维度——矛盾点、空白处、或反复出现的模式。
每个问题：

- 以"—"开头，单独成行
- 不超过40字
- 不给答案，只引发思考
- 语气温和但直指要害

### 二、今日洞察小结（100字以内）

用第三人称视角，客观描述你从记录中观察到的今日状态与核心模式。不评判，只描述。

### 三、明日行动建议（2-3条）

基于今日记录的实际情况，给出具体、可执行的小行动。
格式：▸ [行动] — [原因/预期效果]
要求：

- 具体到可以直接去做，不说废话
- 与用户当日状态强相关，不泛泛而谈
- 难度适中，当天或明天即可完成

## 语言风格

- 中文，书面语偏口语
- 温和但不软弱，直接但不冒犯
- 禁止使用：加油、棒棒的、很好、你真棒等空洞鼓励词
- 禁止说教或长篇大论

如某项为空，推断其可能的意义，并在追问中体现。`;

// ─── Prompt assembly ───

function calcSleepHours(bedtime?: string, waketime?: string): string {
  if (!bedtime || !waketime) return "未记录";
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = waketime.split(":").map(Number);
  let bedMins = bh * 60 + bm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= bedMins) wakeMins += 24 * 60;
  return ((wakeMins - bedMins) / 60).toFixed(1);
}

function buildPrompt(
  log: DailyLog,
  coreModules: Module[],
  bonusModules: Module[],
  emotionSummary: string,
  goalSummary: string
): string {
  const e = log.entries;

  // Meals
  const breakfast = e["diet_breakfast"];
  const lunch = e["diet_lunch"];
  const dinner = e["diet_dinner"];
  const mealParts: string[] = [];
  if (breakfast?.completed) mealParts.push(`早餐${breakfast.notes ? `(${breakfast.notes})` : "✓"}`);
  else mealParts.push("早餐未记录");
  if (lunch?.completed) mealParts.push(`午餐${lunch.notes ? `(${lunch.notes})` : "✓"}`);
  else mealParts.push("午餐未记录");
  if (dinner?.completed) mealParts.push(`晚餐${dinner.notes ? `(${dinner.notes})` : "✓"}`);
  else mealParts.push("晚餐未记录");
  const meals = mealParts.join("　");

  // Sleep
  const sleepEntry = e["sleep_log"];
  const sleepHours = calcSleepHours(sleepEntry?.sleepBedtime, sleepEntry?.sleepWaketime);
  const sleepDetail =
    sleepEntry?.sleepBedtime && sleepEntry?.sleepWaketime
      ? `${sleepEntry.sleepBedtime}入睡，${sleepEntry.sleepWaketime}起床，共${sleepHours}小时`
      : "未记录";

  // Exercise
  const exercise = e["exercise_log"];
  const exerciseText = exercise?.completed
    ? exercise.notes || "已完成"
    : "未记录";

  // Energy proxy: core completion % × 10
  const allCoreItems = coreModules.flatMap((m) => m.items);
  const completedCore = allCoreItems.filter((item) => e[item.id]?.completed).length;
  const energyProxy =
    allCoreItems.length > 0
      ? Math.round((completedCore / allCoreItems.length) * 10)
      : 0;

  // Journal / reflection
  const dailySummary = e["daily_summary"]?.notes || "";
  const deepReflection = e["deep_reflection"]?.notes || "";
  const tomorrowPlan = e["tomorrow_plan"]?.notes || "";
  const journalText = [dailySummary, tomorrowPlan].filter(Boolean).join("\n") || "未填写";

  // Body
  const bodyEntry = e["body_status"];
  const bodyText = bodyEntry?.notes || (bodyEntry?.completed ? "已记录，无详细内容" : "未记录");

  // Awareness
  const awarenessText = deepReflection || "未填写";

  // Challenge tasks
  const challengeParts: string[] = [];
  const emotionChallenge = e["emotion_challenge"];
  const procrastination = e["procrastination"];
  if (emotionChallenge) {
    const status = emotionChallenge.completed ? "已完成" : "未完成";
    const reflection = emotionChallenge.notes || "";
    challengeParts.push(`情绪挑战　状态：${status}${reflection ? `\n反思：${reflection}` : ""}`);
  }
  if (procrastination) {
    const status = procrastination.completed ? "已完成" : "未完成";
    const reflection = procrastination.notes || "";
    challengeParts.push(`克服拖延　状态：${status}${reflection ? `\n反思：${reflection}` : ""}`);
  }

  // Bonus module entries (new things, relationships, entropy reduction, learning)
  const bonusNotes: string[] = [];
  for (const mod of bonusModules) {
    if (mod.key === "challenge") continue; // handled above
    for (const item of mod.items) {
      const entry = e[item.id];
      if (entry?.completed) {
        const note = entry.notes ? `(${entry.notes})` : "";
        bonusNotes.push(`${item.name}${note}`);
      }
    }
  }

  // Learning
  const reading = e["reading"];
  const english = e["english"];
  const learningParts: string[] = [];
  if (reading?.completed) learningParts.push(`阅读${reading.notes ? `(${reading.notes})` : "✓"}`);
  if (english?.completed) learningParts.push(`英语${english.notes ? `(${english.notes})` : "✓"}`);

  const lines = [
    "今日记录如下：",
    "",
    "【状态数据】",
    `情绪：${emotionSummary || "未记录"}　能量（完成率估算）：${energyProxy}/10　睡眠：${sleepDetail}　运动：${exerciseText}`,
    `三餐：${meals}`,
    "",
    "【日记/感悟】",
    journalText,
    "",
    "【身体感受】",
    bodyText,
    "",
    "【当日觉察】",
    awarenessText,
  ];

  if (learningParts.length > 0) {
    lines.push("", "【学习记录】", learningParts.join("　"));
  }

  if (bonusNotes.length > 0) {
    lines.push("", "【其他成就】", bonusNotes.join("、"));
  }

  lines.push("", "【目标进展】", goalSummary || "未记录");

  if (challengeParts.length > 0) {
    lines.push("", "【挑战任务】", challengeParts.join("\n"));
  }

  lines.push("", "请按格式给出今日洞察。");

  return lines.join("\n");
}

// ─── Render insight text (simple markdown-like) ───

function InsightContent({ text }: { text: string }) {
  // Split into lines and render with light formatting
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
        if (line.startsWith("— ") || line.startsWith("—")) {
          return (
            <p key={i} className="text-foreground/90 pl-2 border-l-2 border-primary/40 py-0.5">
              {line}
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
                {parts[1] && (
                  <span className="text-muted-foreground"> — {parts[1]}</span>
                )}
              </span>
            </p>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

// ─── Main Component ───

export default function InsightReview({ log, coreModules, bonusModules }: InsightReviewProps) {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const [insight, setInsight] = useState<string | null>(() => getCached(today));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (force = false) => {
      if (!user) return;
      if (loading) return;

      const cached = getCached(today);
      if (cached && !force) {
        setInsight(cached);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch supplemental data in parallel
        const [emotionRecords, goals] = await Promise.all([
          getEmotionRecords(user.id),
          getGoals(user.id),
        ]);

        // Emotion summary for today
        const todayEmotions = emotionRecords.filter((r) => r.date === today);
        const emotionSummary =
          todayEmotions.length > 0
            ? todayEmotions
                .map((r) => `${r.emotionType}(强度${r.intensity})${r.trigger ? `，触发：${r.trigger}` : ""}`)
                .join("；")
            : "";

        // Goal summary
        const goalSummary =
          goals.length > 0
            ? goals
                .map((g) => {
                  const statusMap: Record<string, string> = {
                    not_started: "未开始",
                    in_progress: "进行中",
                    completed: "已完成",
                  };
                  return `${g.title}（${statusMap[g.status] ?? g.status}）`;
                })
                .join("；")
            : "";

        const prompt = buildPrompt(log, coreModules, bonusModules, emotionSummary, goalSummary);

        const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
        if (!apiKey) throw new Error("未配置 VITE_DEEPSEEK_API_KEY，请在 Netlify 环境变量中添加");

        const res = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            max_tokens: 1024,
            messages: [
              { role: "system", content: DEEPSEEK_SYSTEM_PROMPT },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`DeepSeek 接口错误 ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const insightText: string = data.choices?.[0]?.message?.content ?? "";
        if (!insightText) throw new Error("未收到回复");

        setInsight(insightText);
        setCache(today, data.insight);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "生成失败，请稍后重试";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [user, log, coreModules, bonusModules, today, loading]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-violet-500/5 to-primary/5 rounded-2xl border border-primary/10 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">芦苇 · 今日洞察</h3>
          <p className="text-[10px] text-muted-foreground/70">苏格拉底式成长引导</p>
        </div>
        {!loading && (
          <button
            onClick={() => generate(!!insight)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors rounded-lg px-2.5 py-1.5"
          >
            {insight ? (
              <>
                <RefreshCw className="w-3 h-3" />
                重新生成
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                生成洞察
              </>
            )}
          </button>
        )}
        {loading && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            思考中…
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-4 text-[11px] text-destructive"
          >
            {error}
          </motion.div>
        )}

        {!insight && !loading && !error && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-4 text-[11px] text-muted-foreground/60"
          >
            点击「生成洞察」，芦苇将基于你今日的记录给出反思问题和行动建议。
          </motion.div>
        )}

        {insight && !loading && (
          <motion.div
            key="insight"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-4"
          >
            <InsightContent text={insight} />
          </motion.div>
        )}

        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-4 space-y-2"
          >
            {[60, 80, 50, 70, 45].map((w, i) => (
              <div
                key={i}
                className="h-2.5 bg-muted/60 rounded animate-pulse"
                style={{ width: `${w}%` }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
