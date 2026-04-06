const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const LOVABLE_API_URL = "https://api.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a screen time data extractor. Given a screenshot of a phone's screen time report (iOS or Android), extract the following data and return it as a JSON object:
{
  "totalMinutes": <number, total screen time in minutes>,
  "pickups": <number, how many times the phone was picked up, 0 if not visible>,
  "categoryBreakdown": {
    "社交": <minutes>,
    "娱乐": <minutes>,
    "工具": <minutes>,
    "学习": <minutes>,
    "工作": <minutes>,
    "其他": <minutes>
  }
}

Guidelines:
- Convert hours to minutes (e.g., "2小时30分" = 150 minutes, "2h 30m" = 150)
- Map app categories: 社交网络/Social → 社交, 娱乐/Entertainment → 娱乐, 效率/Productivity → 工作, 教育/Education → 学习, 工具/Utilities → 工具
- If a category is not visible, set it to 0
- If you can't parse the image, return {"error": "无法识别截图内容"}
- Only return the JSON, no other text`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
              {
                type: "text",
                text: "请从这张屏幕时间截图中提取数据。",
              },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error [${response.status}]: ${errText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "无法解析AI返回的数据" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error parsing screen time:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
