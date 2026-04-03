import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `你是"芦苇"——一位苏格拉底式的个人成长引导者，现在进行每周回顾总结。

你的核心任务是：基于用户过去一周的所有生活记录，进行深度整合分析，找出趋势、模式和关键洞察。

## 输出结构（严格按此格式）

### 一、本周总览

用2-3句话概括本周的整体状态和核心节奏。数据驱动，不空泛。

### 二、关键发现（3-4条）

从数据中提炼出最重要的模式和趋势：
- 以"▸"开头
- 结合具体数据说明（如完成率、频次、变化趋势）
- 涵盖不同维度：习惯执行、情绪波动、睡眠规律、目标进展等

### 三、本周亮点

挑出1-2个值得肯定的进步或坚持，用具体数据支撑。不空洞夸赞，只陈述事实和意义。

### 四、待改善区域

指出1-2个需要关注的薄弱环节，给出具体的改善方向。

### 五、下周行动建议（2-3条）

格式：▸ [具体行动] — [预期效果]
要求：
- 基于本周数据推导，不泛泛而谈
- 可操作、可衡量
- 难度递进：一条容易的，一条有挑战的

## 语言风格

- 中文，书面语偏口语
- 温和但不软弱，直接但不冒犯
- 用数据说话，避免空洞鼓励
- 禁止使用：加油、棒棒的、很好、你真棒等空洞鼓励词`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
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
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 2048,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: body.prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI API error:", res.status, errText);
      if (res.status === 429) {
        return new Response(
          JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
          { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      if (res.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI 额度已用完，请充值" }),
          { status: 402, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: `AI API error: ${res.status}` }),
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
