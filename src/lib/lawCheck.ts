// 死亡条款的自动对表 —— 把 docs/法典.md 里"感知死/判断死"的失败信号，
// 从纸面约定变成可计算的判定。谄媚死与"洞察打开次数"需自查/埋点，不在此。
import { differenceInCalendarDays } from "date-fns";

// 法的最近修订日期 —— 必须与 docs/法典.md "修订记录"顶部一致。
// 改「芦苇」prompt 或法典时，同步更新这里，否则"判断死"对表会失真。
export const LAW_LAST_UPDATED = "2026-06-23";

export const PERCEPTION_DEATH_DAYS = 21; // 感知死：连续无记录天数阈值
export const JUDGMENT_DEATH_DAYS = 365; // 判断死：法 / prompt 未改一字的阈值

export type LawSignalLevel = "ok" | "warn" | "dead";

export interface LawSignal {
  clause: "感知死" | "判断死";
  level: LawSignalLevel;
  value: number; // 实测天数
  threshold: number;
  message: string;
}

/** 从某个 yyyy-MM-dd 到今天的日历天数差；非法/空返回 null。 */
export function daysSince(dateStr: string | null, today: Date = new Date()): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return differenceInCalendarDays(today, d);
}

/** 感知死：系统不再跟现实对表 —— 连续无记录天数 ≥ 21。 */
export function checkPerceptionDeath(
  lastRecordDate: string | null,
  today: Date = new Date()
): LawSignal {
  const gap = daysSince(lastRecordDate, today);
  const value = gap ?? 0;
  const level: LawSignalLevel =
    lastRecordDate == null
      ? "ok" // 从无记录 = 尚未开始，不算死
      : value >= PERCEPTION_DEATH_DAYS
      ? "dead"
      : value >= PERCEPTION_DEATH_DAYS - 7
      ? "warn"
      : "ok";
  const message =
    lastRecordDate == null
      ? "还没有任何记录"
      : level === "dead"
      ? `已连续 ${value} 天没有记录——系统在对着回音说话`
      : level === "warn"
      ? `已 ${value} 天没记录，接近感知死阈值（${PERCEPTION_DEATH_DAYS} 天）`
      : `上次记录在 ${value} 天前`;
  return { clause: "感知死", level, value, threshold: PERCEPTION_DEATH_DAYS, message };
}

/** 判断死：判断标准石化 —— 法 / prompt 连续 365 天未改一字。 */
export function checkJudgmentDeath(today: Date = new Date()): LawSignal {
  const value = daysSince(LAW_LAST_UPDATED, today) ?? 0;
  const level: LawSignalLevel =
    value >= JUDGMENT_DEATH_DAYS ? "dead" : value >= JUDGMENT_DEATH_DAYS - 30 ? "warn" : "ok";
  const message =
    level === "dead"
      ? `法与 prompt 已 ${value} 天未改一字——判断力可能已石化，该强制复审`
      : level === "warn"
      ? `法已 ${value} 天未更新，接近判断死阈值（${JUDGMENT_DEATH_DAYS} 天）`
      : `法上次更新在 ${value} 天前`;
  return { clause: "判断死", level, value, threshold: JUDGMENT_DEATH_DAYS, message };
}

export function checkLaw(lastRecordDate: string | null, today: Date = new Date()): LawSignal[] {
  return [checkPerceptionDeath(lastRecordDate, today), checkJudgmentDeath(today)];
}
