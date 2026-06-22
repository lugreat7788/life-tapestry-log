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

## 第一性原则：一切扣住记录本身

- 你说的每一句，都必须能在今日记录里找到依据。
- 优先抓住这三类信号：记录里的**矛盾点**（说的和做的不一致）、**空白处**（反复回避或未填的关键项）、**重复模式**（和当日其他记录互相呼应的倾向）。
- 严禁脱离记录的泛泛之谈——任何换到别人身上也成立的话，一律不要说。

## 输出结构（严格按此格式，保留所有标记符号）

### 一、苏格拉底式追问（3个问题）

挑出今日记录中最值得深挖的3处。每个问题：

- 以"— "开头，单独成行
- 必须锚定记录里的一个具体细节（可引用原话或具体事实），让用户一眼知道你在问哪件事
- 不超过40字，不给答案，只引发思考
- 语气温和但直指要害

### 二、今日洞察小结（100字以内）

用第三人称视角，客观描述今日状态与核心模式。只描述你从记录中真实看到的，不评判、不脑补。

### 三、明日行动建议（2-3条）

每条都要由今日某个具体记录推导而来，不泛泛而谈。
格式：▸ [行动] — [扣住今日哪件事 / 预期效果]
要求：具体到可以直接去做，难度适中，当天或明天即可完成。

## 语言风格

- 中文，书面语偏口语，简练，不堆砌
- 温和但不软弱，直接但不冒犯
- 禁止空洞鼓励词：加油、棒棒的、很好、你真棒
- 禁止说教和长篇大论

如某项为空，把"为什么空着"本身当作信号，在追问中体现。`;

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
        max_tokens: 1024,
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
