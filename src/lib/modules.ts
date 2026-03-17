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

export interface ModuleItem {
  id: string;
  name: string;
  points: number;
}

export interface Module {
  key: ModuleKey;
  name: string;
  icon: string;
  colorClass: string;
  bgClass: string;
  fgClass: string;
  items: ModuleItem[];
}

export const MODULES: Module[] = [
  {
    key: "daily_record",
    name: "每日记录",
    icon: "📝",
    colorClass: "module-daily-record",
    bgClass: "bg-module-daily-record",
    fgClass: "text-module-daily-record-fg",
    items: [
      { id: "daily_summary", name: "今日总结", points: 10 },
      { id: "tomorrow_plan", name: "明日计划", points: 5 },
      { id: "deep_reflection", name: "深度反思", points: 15 },
    ],
  },
  {
    key: "health",
    name: "健康生活",
    icon: "💪",
    colorClass: "module-health",
    bgClass: "bg-module-health",
    fgClass: "text-module-health-fg",
    items: [
      { id: "diet_log", name: "饮食记录", points: 5 },
      { id: "sleep_log", name: "睡眠记录", points: 5 },
      { id: "exercise_log", name: "运动记录", points: 10 },
    ],
  },
  {
    key: "challenge",
    name: "挑战自我",
    icon: "🔥",
    colorClass: "module-challenge",
    bgClass: "bg-module-challenge",
    fgClass: "text-module-challenge-fg",
    items: [
      { id: "emotion_challenge", name: "情绪挑战", points: 15 },
      { id: "procrastination", name: "克服拖延任务", points: 10 },
    ],
  },
  {
    key: "new_things",
    name: "尝试新事物",
    icon: "✨",
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
    colorClass: "module-relationships",
    bgClass: "bg-module-relationships",
    fgClass: "text-module-relationships-fg",
    items: [
      { id: "family", name: "家人", points: 10 },
      { id: "friends", name: "朋友", points: 5 },
      { id: "colleagues", name: "同事/同门", points: 5 },
    ],
  },
  {
    key: "learning",
    name: "持续学习",
    icon: "📚",
    colorClass: "module-learning",
    bgClass: "bg-module-learning",
    fgClass: "text-module-learning-fg",
    items: [
      { id: "reading", name: "阅读", points: 10 },
      { id: "english", name: "英语", points: 10 },
      { id: "tcm", name: "中医", points: 10 },
    ],
  },
  {
    key: "entropy_reduction",
    name: "熵减生活",
    icon: "🧹",
    colorClass: "module-entropy-reduction",
    bgClass: "bg-module-entropy-reduction",
    fgClass: "text-module-entropy-reduction-fg",
    items: [
      { id: "energy_mgmt", name: "精力管理", points: 10 },
      { id: "declutter", name: "物品整理", points: 5 },
    ],
  },
  {
    key: "output",
    name: "持续输出",
    icon: "🎯",
    colorClass: "module-output",
    bgClass: "bg-module-output",
    fgClass: "text-module-output-fg",
    items: [
      { id: "wechat_article", name: "公众号文章", points: 20 },
      { id: "video_content", name: "视频号内容", points: 15 },
    ],
  },
  {
    key: "goals",
    name: "目标追踪",
    icon: "🏆",
    colorClass: "module-goals",
    bgClass: "bg-module-goals",
    fgClass: "text-module-goals-fg",
    items: [
      { id: "short_term", name: "近期目标", points: 10 },
      { id: "long_term", name: "远期目标", points: 10 },
    ],
  },
];

export function getModule(key: ModuleKey): Module {
  return MODULES.find((m) => m.key === key)!;
}

export function getModuleMaxPoints(mod: Module): number {
  return mod.items.reduce((sum, item) => sum + item.points, 0);
}

export function getTotalMaxPoints(): number {
  return MODULES.reduce((sum, mod) => sum + getModuleMaxPoints(mod), 0);
}
