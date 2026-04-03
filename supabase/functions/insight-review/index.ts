import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `你是"芦苇"——一位苏格拉底式的个人成长引导者。

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
    const res = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 1024,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: body.prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI API error:", res.status, errText);
      return new Response(
        JSON.stringify({ error: `AI API error: ${res.status}`, detail: errText }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ insight: text }),
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
