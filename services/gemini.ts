import { ShootingPlan, UserInput } from "../types";

// 只用 Vite 的环境变量，避免 Node 端的 process 乱入
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// NewAPI 网关地址
const NEWAPI_BASE_URL = "https://api.gemai.cc";

// 文本 / 图片 使用的模型名（按你在 newapi 控制台里对应的 Google 模型来调）
// 不行就先用 gemini-2.0-flash 测试，稳定一点
const TEXT_MODEL = "gemini-2.5-flash-image";
const IMAGE_MODEL = "gemini-2.5-flash-image";

const SYSTEM_INSTRUCTION = `
你是一位拥有 20 年经验的顶级人像摄影导师，你正在指导一位完全不懂摄影的新手，
使用 Sony A7R3 和 24-70mm F4 镜头拍出“看起来很专业”的人像大片。

你的任务是基于用户输入设计“保姆级”拍摄方案：
- 一部分 9:16 竖构图（适合手机/社媒）
- 一部分 16:9 横构图（更电影感）

硬件约束：
- 镜头最大光圈 F4.0，如需背景虚化，优先使用 50–70mm 端并靠近拍摄。
- 利用 4240 万像素，构图可以稍微宽松，方便后期裁切。
- 开启机身防抖，静态人像快门可以低到 1/60s 左右。

你必须把复杂的摄影知识，翻译成完全不懂摄影的人也能照做的“傻瓜式步骤”。
所有说明使用中文，语气友好但直接，多用可执行动作，少用抽象形容词。
`;

// 通用 HTTP 调用 NewAPI / Google Gemini
async function callGemini(model: string, body: any): Promise<any> {
  if (!API_KEY) {
    throw new Error(
      "VITE_GEMINI_API_KEY 未配置，请在 Zeabur 环境变量中设置 VITE_GEMINI_API_KEY"
    );
  }

  const baseUrl = NEWAPI_BASE_URL.replace(/\/$/, "");
  const url = `${baseUrl}/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(API_KEY)}`;

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

// 尽量把模型的回答“抠”成合法 JSON
function sanitizeJsonFromModel(raw: string): string {
  let s = raw.trim();

  // 去掉 ```json ... ``` 代码块
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

  // 截取从第一个 { 到最后一个 } 的内容
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }

  // 按行删掉注释、空行
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

  // 去掉 } 或 ] 前面的尾逗号
  s = s.replace(/,(\s*[}\]])/g, "$1");

  return s.trim();
}

// 文本：根据 portraitCount / landscapeCount 生成拍摄方案
export const generateShootingPlans = async (
  input: UserInput
): Promise<ShootingPlan[]> => {
  // 如果你的 UserInput 里还没有这两个字段，就改回固定 6 组也行
  const portraitCount = (input as any).portraitCount ?? 3;
  const landscapeCount = (input as any).landscapeCount ?? 3;
  const total = portraitCount + landscapeCount;

  if (total === 0) return [];

  const prompt = `
背景信息:
- 人物: ${input.person}
- 地点: ${input.location}
- 环境: ${input.environment}
- 期望风格: ${input.style}

请生成 ${total} 个极度详细、新手友好的拍摄方案。
其中:
- ${portraitCount} 个方案为 9:16 竖构图 (适合手机/社媒)。
- ${landscapeCount} 个方案为 16:9 横构图 (电影感/故事感)。

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
    contents: [
      {
        role: "user",
        parts: [{ text: SYSTEM_INSTRUCTION + "\n\n" + prompt }],
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

Please generate a simple black and white line drawing sketch only, no colors,
clear composition, suitable for aspect ratio ${validRatio}.`,
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
