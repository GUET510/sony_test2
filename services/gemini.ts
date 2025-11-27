import { ShootingPlan, UserInput } from "../types";

// 在构建阶段由 Vite 用 GEMINI_API_KEY 替换这里
const API_KEY = process.env.API_KEY as string | undefined;

// NewAPI 网关地址（你用的是 api.gemai.cc）
const NEWAPI_BASE_URL = "https://api.gemai.cc";

// 文本与图片统一用 Google Gemini 模型名称
// 按 NewAPI 文档，推荐 gemini-2.0-flash，有需要可以在控制台改成 2.5 等
const TEXT_MODEL = "[满血A]gemini-3-pro-preview-thinking";
const IMAGE_MODEL = "gemini-3-pro-image-preview";

const SYSTEM_INSTRUCTION = `
你是一位拥有 20 年经验的顶级人像摄影导师，你正在指导一位完全不懂摄影的新手，
使用 Sony A7R3 和 24-70mm F4 镜头拍出“看起来很专业”的人像大片。

你的任务是基于用户输入设计 6 组“保姆级”拍摄方案：
1～3 号方案：9:16 竖构图（适合手机刷视频）
4～6 号方案：16:9 横构图（更电影感）

硬件约束：
- 镜头最大光圈 F4.0，如需背景虚化，优先使用 50–70mm 端并靠近拍摄。
- 充分利用 4240 万像素，允许构图稍微宽松，方便后期裁切。
- 开启机身防抖，静态人像快门可以低到 1/60s 左右。

你必须把复杂的摄影知识，翻译成完全不懂摄影的人也能照做的“傻瓜式步骤”。
所有说明使用中文，语气友好但直接，避免空洞形容词，多用可执行动作。
`;

// 通用调用 NewAPI Gemini GenerateContent 的封装
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

// 文本：生成 6 组拍摄方案
export const generateShootingPlans = async (input: UserInput): Promise<ShootingPlan[]> => {
  const prompt = `
背景信息：
- 人物：${input.person}
- 地点：${input.location}
- 环境：${input.environment}
- 期望风格：${input.style}

请你帮我设计 6 组拍摄方案：
1～3 号方案必须是 9:16 竖构图；
4～6 号方案必须是 16:9 横构图。

要求：
- 每个方案都要有一个有记忆点的标题（稍微有点电影感或故事感）。
- 所有参数和动作都要具体到“普通人照着做就能拍”，禁止只说“适当靠近”“适当虚化”这种废话。
- 输出时严格按照 JSON 格式：
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
只返回 JSON，不要出现多余解释文字。
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
    generationConfig: {
      // 按 NewAPI 文档，JSON 模式用下划线命名
      response_mime_type: "application/json",
      response_schema: {
        type: "OBJECT",
        properties: {
          plans: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                targetAspectRatio: { type: "STRING" },
                imagePrompt: { type: "STRING" },

                focalLength: { type: "STRING" },
                aperture: { type: "STRING" },
                shutterSpeed: { type: "STRING" },
                iso: { type: "STRING" },
                whiteBalance: { type: "STRING" },
                colorTint: { type: "STRING" },

                distance: { type: "STRING" },
                angle: { type: "STRING" },

                lightingGuide: { type: "STRING" },
                compositionGuide: { type: "STRING" },
                photographerPosition: { type: "STRING" },

                poseAction: { type: "STRING" },
                poseEyes: { type: "STRING" },
                modelDirecting: { type: "STRING" },

                expertAdvice: { type: "STRING" },
              },
              required: [
                "title",
                "targetAspectRatio",
                "imagePrompt",
                "focalLength",
                "aperture",
                "shutterSpeed",
                "iso",
                "whiteBalance",
                "colorTint",
                "distance",
                "angle",
                "lightingGuide",
                "compositionGuide",
                "photographerPosition",
                "poseAction",
                "poseEyes",
                "modelDirecting",
                "expertAdvice",
              ],
            },
          },
        },
      },
    },
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

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    console.error("解析 JSON 失败，原始内容:", rawText);
    throw new Error("模型返回非合法 JSON");
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
