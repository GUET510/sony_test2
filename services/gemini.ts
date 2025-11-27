import { ShootingPlan, UserInput } from "../types";

const API_KEY = process.env.API_KEY as string | undefined;
const NEWAPI_BASE_URL = "https://api.gemai.cc";

// 默认模型，可以按你在控制台看到的实际名称调整
const TEXT_MODEL = "gemini-3-pro-preview";
const IMAGE_MODEL = "gemini-3-pro-preview";

const SYSTEM_INSTRUCTION = `
你是一位拥有 20 年经验的顶级人像摄影导师，你正在指导一位**完全不懂摄影的新手**使用 **Sony A7R3** 和 **24-70mm F4** 镜头拍出大片。

你的任务是基于用户输入设计**保姆级**拍摄方案。
请严格按照用户指定的数量生成对应比例的方案（9:16 竖构图 或 16:9 横构图）。

**器材硬件约束：**
1. **镜头限制**：最大光圈 **F4.0**。若需虚化，强制建议使用 **50mm-70mm** 长焦端并靠近拍摄。
2. **高画质优势**：利用 4240 万像素优势，构图可以稍松，便于后期裁切。
3. **防抖**：利用机身防抖，静态拍摄快门可低至 1/60s。

**核心要求 - 必须让新手“照着做就能拍”：**
- **构图指导 (compositionGuide)**：禁止使用抽象词汇。必须说“打开相机的九宫格线，把模特的左眼放在右上角的交叉点上”或“让地平线位于画面下三分之一处”。
- **光线指导 (lightingGuide)**：禁止只说“顺光/逆光”。必须说“让模特站在窗户前1米处，脸转向窗户45度”或“让阳光从模特头发后面照过来，形成发光轮廓”。
- **摄影师机位 (photographerPosition)**：必须极度具体。例如：“不要站着拍！单膝跪地，把相机举到胸口高度，屏幕翻折向上看”或“站在椅子上俯拍”。
- **沟通话术 (modelDirecting)**：提供一句具体的**台词**。例如：“不要说‘笑一下’，要说：‘想象你刚刚在街角偶遇了暗恋的人’”。

所有指导性文字必须用**中文**，语气鼓励、清晰、极其具体，像在手把手教。
`;

// 通用 HTTP 调用 NewAPI / Google Gemini
async function callGemini(model: string, body: any): Promise<any> {
  if (!API_KEY) {
    throw new Error("API_KEY 未配置，请在 Zeabur 中设置 GEMINI_API_KEY 环境变量");
  }

  const baseUrl = NEWAPI_BASE_URL.replace(/\/$/, "");
  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    API_KEY
  )}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini HTTP error", res.status, errText);
    throw new Error(`调用 Gemini 接口失败（HTTP ${res.status}）`);
  }

  return res.json();
}

// 清洗模型返回的字符串，尽量变成合法 JSON
function sanitizeJsonFromModel(raw: string): string {
  let s = raw.trim();

  // 去掉 ```json ... ``` 代码块包裹
  if (s.startsWith("```")) {
    const firstNewline = s.indexOf("\n");
    if (firstNewline !== -1) {
      s = s.slice(firstNewline + 1);
    }
    const lastFence = s.lastIndexOf("```");
    if (lastFence !== -1) {
      s = s.slice(0, lastFence);
    }
    s = s.trim();
  }

  // 截取从第一个 { 到最后一个 }，把前后废话裁掉
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }

  // 按行处理，删掉注释行
  const lines = s
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.startsWith("//") &&
        !line.startsWith("#") &&
        !line.startsWith("/*") &&
        !line.startsWith("*") &&
        !line.startsWith("--")
    );

  s = lines.join("\n");

  // 去掉 } 或 ] 前面的尾逗号，例如 "..., }" 或 "..., ]"
  s = s.replace(/,(\s*[}\]])/g, "$1");

  return s.trim();
}

// 文本：生成 N 组拍摄方案（根据 portraitCount / landscapeCount）
export const generateShootingPlans = async (input: UserInput): Promise<ShootingPlan[]> => {
  const total = input.portraitCount + input.landscapeCount;
  if (total === 0) return [];

  const prompt = `
背景信息:
人物: ${input.person}
地点: ${input.location}
环境: ${input.environment}
期望风格: ${input.style}

请生成 ${total} 个极度详细、新手友好的拍摄方案。
其中:
- ${input.portraitCount} 个方案为 9:16 竖构图 (适合手机/社媒)。
- ${input.landscapeCount} 个方案为 16:9 横构图 (电影感/故事感)。

请按顺序先输出所有 9:16 竖构图方案，再输出所有 16:9 横构图方案。

输出格式必须是合法 JSON：
{
  "plans": [
    {
      "title": "...",
      "targetAspectRatio": "9:16 或 16:9",
      "imagePrompt": "英文线稿提示词，用于生成黑白线稿构图草图",
      "focalLength": "...",
      "aperture": "...",
      "shutterSpeed": "...",
      "iso": "...",
      "whiteBalance": "...",
      "colorTint": "...",
      "distance": "...",
      "angle": "...",
      "lightingGuide": "...",
      "compositionGuide": "...",
      "photographerPosition": "...",
      "poseAction": "...",
      "poseEyes": "...",
      "modelDirecting": "...",
      "expertAdvice": "..."
    }
  ]
}

注意：
- 不要输出任何解释性文字。
- 不要加 "```json" 代码块。
- 不要加注释。
- 不要在最后一个字段后面加逗号。
`;

  const body = {
    systemInstruction: {
      role: "system",
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  };

  const data = await callGemini(TEXT_MODEL, body);

  const rawText =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text || "")
      .join("") || "";

  if (!rawText) {
    console.error("Gemini 返回内容为空:", JSON.stringify(data, null, 2));
    throw new Error("模型返回为空");
  }

  const cleaned = sanitizeJsonFromModel(rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error("模型返回非合法 JSON，原始内容:", rawText);
    console.error("清洗后的 JSON 字符串:", cleaned);
    throw new Error("模型返回非合法 JSON，请打开控制台查看详细日志");
  }

  return (parsed.plans || []) as ShootingPlan[];
};

// 图片：根据 imagePrompt 生成一张黑白线稿草图（base64）
export const generateSketch = async (
  prompt: string,
  aspectRatio: string
): Promise<string | null> => {
  try {
    const validRatio = aspectRatio === "16:9" ? "16:9" : "9:16";

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${prompt}

Please generate a simple black and white line drawing sketch only, no colors, clear composition,
suitable for aspect ratio ${validRatio}.`,
            },
          ],
        },
      ],
    };

    const data = await callGemini(IMAGE_MODEL, body);

    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      const inlineData = (part as any).inline_data || (part as any).inlineData;
      if (inlineData && inlineData.data) {
        const mimeType = inlineData.mime_type || inlineData.mimeType || "image/png";
        return `data:${mimeType};base64,${inlineData.data}`;
      }
    }

    return null;
  } catch (error) {
    console.error("Error generating sketch:", error);
    return null;
  }
};
