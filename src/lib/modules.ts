export type ModuleKey =
  | "daily_record"
  | "health"
  | "challenge"
  | "new_things"
  | "relationships"
  | "learning"
  | "entropy_reduction"
  | "output"
  | "goals";

export type ModuleTier = "core" | "bonus";

export interface ModuleItem {
  id: string;
  name: string;
  points: number;
}

export interface Module {
  key: ModuleKey;
  name: string;
  icon: string;
  tier: ModuleTier;
  colorClass: string;
  bgClass: string;
  fgClass: string;
  items: ModuleItem[];
}

// Tier 1 — Core Daily Score (满分 100分)
export const CORE_MODULES: Module[] = [
  {
    key: "daily_record",
    name: "每日记录",
    icon: "📝",
    tier: "core",
    colorClass: "module-daily-record",
    bgClass: "bg-module-daily-record",
    fgClass: "text-module-daily-record-fg",
    items: [
      { id: "daily_summary", name: "今日总结", points: 10 },
      { id: "tomorrow_plan", name: "明日计划", points: 10 },
      { id: "deep_reflection", name: "深度反思", points: 10 },
      { id: "idea_capture", name: "灵感捕捉", points: 5 },
    ],
  },
  {
    key: "health",
    name: "健康生活",
    icon: "💪",
    tier: "core",
    colorClass: "module-health",
    bgClass: "bg-module-health",
    fgClass: "text-module-health-fg",
    items: [
      { id: "diet_breakfast", name: "早餐记录", points: 3 },
      { id: "diet_lunch", name: "午餐记录", points: 3 },
      { id: "diet_dinner", name: "晚餐记录", points: 4 },
      { id: "body_status", name: "身体状况", points: 3 },
      { id: "body_signal", name: "身体信号", points: 5 },
      { id: "sleep_log", name: "睡眠记录", points: 5 },
      { id: "exercise_log", name: "运动记录", points: 10 },
      { id: "bowel_log", name: "排便记录", points: 2 },
    ],
  },
  {
    key: "learning",
    name: "持续学习",
    icon: "📚",
    tier: "core",
    colorClass: "module-learning",
    bgClass: "bg-module-learning",
    fgClass: "text-module-learning-fg",
    items: [
      { id: "reading", name: "阅读", points: 10 },
      { id: "english", name: "英语", points: 10 },
    ],
  },
  // output module removed from core daily tracking — items moved to long-term goals
];

// Tier 2 — Bonus Score (额外加分，不设上限)
export const BONUS_MODULES: Module[] = [
  {
    key: "challenge",
    name: "挑战自我",
    icon: "🔥",
    tier: "bonus",
    colorClass: "module-challenge",
    bgClass: "bg-module-challenge",
    fgClass: "text-module-challenge-fg",
    items: [
      { id: "emotion_challenge", name: "情绪挑战", points: 10 },
      { id: "procrastination", name: "克服拖延任务", points: 10 },
    ],
  },
  {
    key: "new_things",
    name: "尝试新事物",
    icon: "✨",
    tier: "bonus",
    colorClass: "module-new-things",
    bgClass: "bg-module-new-things",
    fgClass: "text-module-new-things-fg",
    items: [
      { id: "taichi", name: "太极", points: 10 },
      { id: "jinganggong", name: "金刚功", points: 10 },
      { id: "flute", name: "笛子", points: 10 },
      { id: "guitar", name: "吉他", points: 10 },
    ],
  },
  {
    key: "relationships",
    name: "人际维护",
    icon: "❤️",
    tier: "bonus",
    colorClass: "module-relationships",
    bgClass: "bg-module-relationships",
    fgClass: "text-module-relationships-fg",
    items: [
      { id: "family", name: "家人", points: 5 },
      { id: "friends", name: "朋友", points: 5 },
      { id: "colleagues", name: "同事/同门", points: 5 },
    ],
  },
  {
    key: "entropy_reduction",
    name: "熵减生活",
    icon: "🧹",
    tier: "bonus",
    colorClass: "module-entropy-reduction",
    bgClass: "bg-module-entropy-reduction",
    fgClass: "text-module-entropy-reduction-fg",
    items: [
      { id: "energy_mgmt", name: "精力管理", points: 5 },
      { id: "declutter", name: "物品整理", points: 5 },
    ],
  },
];

// Goals module — standalone, not in core or bonus
export const GOALS_MODULE: Module = {
  key: "goals",
  name: "目标追踪",
  icon: "🏆",
  tier: "bonus",
  colorClass: "module-goals",
  bgClass: "bg-module-goals",
  fgClass: "text-module-goals-fg",
  items: [
    { id: "short_term", name: "近期目标", points: 10 },
    { id: "long_term", name: "远期目标", points: 20 },
  ],
};

export const MODULES: Module[] = [...CORE_MODULES, ...BONUS_MODULES, GOALS_MODULE];

export function getModule(key: ModuleKey): Module {
  return MODULES.find((m) => m.key === key)!;
}

export function getModuleMaxPoints(mod: Module): number {
  return mod.items.reduce((sum, item) => sum + item.points, 0);
}

export function getCoreMaxPoints(): number {
  return CORE_MODULES.reduce((sum, mod) => sum + getModuleMaxPoints(mod), 0);
}

export function getTotalMaxPoints(): number {
  return MODULES.reduce((sum, mod) => sum + getModuleMaxPoints(mod), 0);
}

// Default module data for reset
export const DEFAULT_CORE_MODULES = JSON.parse(JSON.stringify(CORE_MODULES));
export const DEFAULT_BONUS_MODULES = JSON.parse(JSON.stringify(BONUS_MODULES));
export const DEFAULT_GOALS_MODULE = JSON.parse(JSON.stringify(GOALS_MODULE));
