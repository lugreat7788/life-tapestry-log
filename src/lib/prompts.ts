// ─── Micro-Prompt Templates ───
// Rotating prompts for high-friction items to reduce blank-page paralysis

export const DEFAULT_PROMPTS: Record<string, string[]> = {
  deep_reflection: [
    "今天什么事让你有点不舒服？为什么？",
    "如果重来一次，今天你会改变什么？",
    "今天有没有一个让你觉得值得记录的瞬间？",
    "今天最让你意外的一件事是什么？",
    "今天你做了什么让自己骄傲的小事？",
    "你今天回避了什么？为什么？",
    "今天谁影响了你的情绪？怎样影响的？",
    "今天你有没有发现自己重复的行为模式？",
  ],
  daily_summary: [
    "今天最重要的三件事是什么？",
    "如果用一个词形容今天，你会选什么？",
    "今天你最满意的一个决定是什么？",
    "今天有什么事情超出了你的预期？",
    "今天你学到了什么新的东西？",
  ],
  wechat_article: [
    "有没有一个最近的想法值得写成一段话？",
    "今天学到的一件事，能用3句话说清楚吗？",
    "最近有什么让你改变看法的事？",
    "有没有一个你反复想到的主题？",
    "你最近在思考什么问题？试着写下来。",
  ],
  video_content: [
    "如果今天拍一个60秒视频，你会讲什么？",
    "最近有什么值得分享的生活体验？",
    "你今天看到了什么有趣的东西？",
  ],
  reading: [
    "今天读了哪本书的哪个部分？",
    "读到了什么让你印象深刻的观点？",
    "有没有读到和你经验呼应的内容？",
  ],
  english: [
    "今天学了什么新的英语词汇？",
    "用英语描述你今天做的一件事。",
    "今天接触到了什么英语内容？",
  ],
  idea_capture: [
    "今天有什么想法值得未来写出来？一句话即可。",
    "最近脑海中反复出现的一个主题是什么？",
    "今天看到/听到了什么激发灵感的东西？",
    "有没有一个想法你一直想展开但还没动笔？",
  ],
  exercise_log: [
    "今天做了什么运动？持续了多久？",
    "运动时身体感觉怎么样？",
    "今天有没有走够一万步？",
  ],
  bowel_log: [
    "今天排便情况如何？",
    "记录一下排便时间和感受吧。",
  ],
};

// Quick entry prompts — simplified one-line versions for ⚡ mode
export const QUICK_ENTRY_PROMPTS: Record<string, string> = {
  deep_reflection: "今天最重要的一个想法是？",
  daily_summary: "用一句话概括今天。",
  idea_capture: "今天有什么想法值得未来写出来？一句话即可。",
  wechat_article: "写了什么？哪怕一句话的草稿也算。",
  video_content: "拍了什么？哪怕一个灵感记录也算。",
  reading: "读了什么？哪怕一页也行。",
  english: "学了什么？一个词/一句话也行。",
  exercise_log: "做了什么运动？哪怕散步也算。",
  tomorrow_plan: "明天最想完成的一件事？",
};

// Skip reasons
export const SKIP_REASONS = [
  { key: "no_time", label: "没时间" },
  { key: "forgot", label: "忘了" },
  { key: "bad_mood", label: "状态不好" },
  { key: "dont_know", label: "不知道写什么" },
  { key: "skip", label: "跳过，不记录原因" },
];

export function getDailyPrompt(itemId: string, customPrompts?: string[]): string | null {
  const prompts = customPrompts?.length ? customPrompts : DEFAULT_PROMPTS[itemId];
  if (!prompts || prompts.length === 0) return null;
  // Use day-of-year as seed for deterministic daily rotation
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return prompts[dayOfYear % prompts.length];
}
