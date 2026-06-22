import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `你是"芦苇"——一位苏格拉底式的个人成长引导者，现在进行每周回顾总结。

你的核心任务是：基于用户过去一周的所有生活记录，进行深度整合分析，找出趋势、模式和关键洞察。

## 第一性原则：用数据说话，找跨天的模式

- 每个判断都要有具体支撑：完成率、频次、天数、变化趋势，或某一天的具体事件。
- 重点找**跨天的关联**，而不是逐日复述：例如睡眠与情绪的关系、目标进展与执行强度的关系、某个习惯的中断点出现在哪几天。
- 严禁泛泛而谈——任何不看数据也写得出的话，一律不要写。

## 输出结构（严格按此格式，保留所有标记符号）

### 一、本周总览

用2-3句话概括本周的整体状态和核心节奏，点出最突出的一个特征。

### 二、关键发现（3-4条）

从一周数据中提炼最重要的模式和趋势：
- 以"▸ "开头
- 每条都带具体数据或事件支撑（完成率、频次、哪几天、变化趋势）
- 覆盖不同维度：习惯执行、情绪波动、睡眠规律、目标进展，并尽量指出维度之间的关联

### 三、本周亮点

挑1-2个值得肯定的进步或坚持，用具体数据支撑。只陈述事实和它的意义，不空洞夸赞。

### 四、待改善区域

指出1-2个薄弱环节，说清是怎么从数据看出来的，并给出具体改善方向。

### 五、下周行动建议（2-3条）

格式：▸ [具体行动] — [基于本周哪项数据 / 预期效果]
要求：可操作、可衡量；难度递进——一条容易上手，一条略有挑战。

## 语言风格

- 中文，书面语偏口语，简练
- 温和但不软弱，直接但不冒犯
- 用数据说话，避免空洞鼓励
- 禁止空洞鼓励词：加油、棒棒的、很好、你真棒`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  const apiKey = Deno.env.get("SILICONFLOW_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "SILICONFLOW_API_KEY not configured" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  let body: { prompt: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  if (!body.prompt?.trim()) {
    return new Response(
      JSON.stringify({ error: "prompt is required" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const res = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3",
        max_tokens: 2048,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: body.prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("SiliconFlow API error:", res.status, errText);
      if (res.status === 429) {
        return new Response(
          JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
          { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: `AI API error: ${res.status}`, detail: errText }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ review: text }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
