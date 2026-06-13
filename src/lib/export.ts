import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Module } from "@/lib/modules";

// ─── Insight helpers (shared with InsightsPage) ───────────────────────────

export function contentToMarkdown(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      if (line.startsWith("▸ ")) return `- ${line.slice(2)}`;
      if (line.startsWith("— ")) return `> ${line.slice(2)}`;
      return line;
    })
    .join("\n");
}

function formatDailyPeriod(period: string): string {
  try {
    return format(new Date(period + "T12:00:00"), "yyyy年M月d日 EEEE", { locale: zhCN });
  } catch { return period; }
}

function formatWeeklyPeriod(period: string): string {
  const [start, end] = period.split("_");
  try {
    return `${format(new Date(start + "T12:00:00"), "M/d")} ~ ${format(new Date(end + "T12:00:00"), "M/d")}`;
  } catch { return period; }
}

export function insightToMarkdown(insight: {
  type: string;
  period: string;
  content: string;
  updatedAt: string;
}): string {
  const isDaily = insight.type === "daily";
  const label = isDaily
    ? formatDailyPeriod(insight.period)
    : `${formatWeeklyPeriod(insight.period)} 周回顾`;
  return [
    `# ${isDaily ? "芦苇 · 今日洞察" : "芦苇 · 每周回顾"}`,
    ``,
    `**${label}**`,
    ``,
    `---`,
    ``,
    contentToMarkdown(insight.content),
    ``,
    `---`,
    ``,
    `*由 LifeLog 芦苇 AI 生成 · ${format(new Date(insight.updatedAt), "yyyy-MM-dd")}*`,
  ].join("\n");
}

// ─── Download helper ───────────────────────────────────────────────────────

export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Daily log → Markdown ─────────────────────────────────────────────────

function calcSleepLine(bedtime: string, waketime: string): string {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = waketime.split(":").map(Number);
  let bedMin = bh * 60 + bm;
  let wakeMin = wh * 60 + wm;
  if (wakeMin <= bedMin) wakeMin += 24 * 60;
  const dur = ((wakeMin - bedMin) / 60).toFixed(1);
  return `${bedtime} 入睡 → ${waketime} 起床（${dur}h）`;
}

function parseBowelNotes(raw: string): string {
  try {
    const p = JSON.parse(raw);
    return [
      p.time    && `时间：${p.time}`,
      p.color   && `颜色：${p.color}`,
      p.form    && `形态：${p.form}`,
      p.feeling && `感受：${p.feeling}`,
    ].filter(Boolean).join("　") || raw;
  } catch {
    return raw;
  }
}

export function buildDayMarkdown(
  log: { date?: string; entries: Record<string, any>; totalPoints: number },
  date: Date,
  coreModules: Module[],
  bonusModules: Module[]
): string {
  const dateLabel = format(date, "yyyy年M月d日 EEEE", { locale: zhCN });
  const lines: string[] = [];

  lines.push(`# ${dateLabel}`);
  lines.push(``);
  lines.push(`**总积分：${log.totalPoints} 分**`);
  lines.push(``);
  lines.push(`---`);

  const renderModule = (mod: Module) => {
    const freeEntry = log.entries[`${mod.key}_freeform`];
    const hasAnyEntry = mod.items.some((item) => log.entries[item.id]) || !!freeEntry?.notes;
    if (!hasAnyEntry) return;

    lines.push(``);
    lines.push(`## ${mod.icon} ${mod.name}`);
    lines.push(``);

    for (const item of mod.items) {
      const entry = log.entries[item.id];
      if (!entry) {
        lines.push(`- ○ ${item.name}`);
        continue;
      }

      const isMinimum = entry.completionType === "minimum";
      const mark = entry.completed ? (isMinimum ? "🌱" : "✅") : "○";
      const pts = entry.completed ? ` +${item.points}分` : "";
      const label = entry.completed ? `**${item.name}**` : item.name;

      // Sleep: parse bedtime / waketime from entry
      if (item.id === "sleep_log") {
        lines.push(`- ${mark} ${label}${pts}`);
        if (entry.sleepBedtime && entry.sleepWaketime) {
          lines.push(`  ${calcSleepLine(entry.sleepBedtime, entry.sleepWaketime)}`);
        }
        if (entry.notes) lines.push(`  ${entry.notes}`);
        continue;
      }

      // Bowel: stored as JSON
      if (item.id === "bowel_log") {
        lines.push(`- ${mark} ${label}${pts}`);
        if (entry.notes) lines.push(`  ${parseBowelNotes(entry.notes)}`);
        continue;
      }

      // Default
      lines.push(`- ${mark} ${label}${pts}`);
      if (entry.notes) lines.push(`  ${entry.notes}`);
    }

    if (freeEntry?.notes) {
      lines.push(``);
      lines.push(`> ✍️ ${freeEntry.notes}`);
    }
  };

  lines.push(``);
  lines.push(`## 每日必修`);
  for (const mod of coreModules) renderModule(mod);

  const hasBonus = bonusModules.some(
    (mod) =>
      mod.items.some((item) => log.entries[item.id]) ||
      !!log.entries[`${mod.key}_freeform`]?.notes
  );
  if (hasBonus) {
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
    lines.push(`## ✨ 成长加分`);
    for (const mod of bonusModules) renderModule(mod);
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`*由 LifeLog 导出 · ${format(new Date(), "yyyy-MM-dd HH:mm")}*`);

  return lines.join("\n");
}
