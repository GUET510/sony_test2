import { ShootingPlan, UserInput } from "../types";

// 用 Vite 注入的 process.env.API_KEY（vite.config.ts 里已经 define 了）
const API_KEY = process.env.API_KEY as string | undefined;

// NewAPI 网关地址
const NEWAPI_BASE_URL = "https://api.gemai.cc";

// 文本 / 图片 模型（先用官方稳定的 text 模型，后面你可以自己改）
const TEXT_MODEL = "gemini-3-pro-preview";
const IMAGE_MODEL = "gemini-3-pro-preview";

const SYSTEM_INSTRUCTION = `
你是一位拥有 20 年经验的顶级人像摄影导师，正在指导一个完全不懂摄影的新手，
用 Sony A7R3 + 24-70mm F4 拍出“看上去很专业”的人像照片。

要求：
- 所有参数必须具体：焦段、光圈、快门、ISO、白平衡。
- 所有动作必须是普通人能听懂、照着做的步骤。
- 输出为 JSON，对每一组方案给出完整字段。
`;

// 通用 HTTP 调用 NewAPI / Google Gemini
async function callGemini(model: string, body: any): Promise<any> {
  if (!API_KEY) {
    throw new Error(
      "API_KEY 未配置：请在 Zeabur 环境变量中设置 GEMINI_API_KEY，再重新部署。"
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

// 把模型返回的文本尽量“抠”成合法 JSON 字符串
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

  // 删掉注释行
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
  const portraitCount = input.portraitCount ?? 3;
  const landscapeCount = input.landscapeCount ?? 3;
  const total = portraitCount + landscapeCount;

  if (total === 0) return [];

  const prompt = `
用户输入：
- 人物: ${input.person}
- 拍摄地点: ${input.location}
- 环境描述: ${input.environment}
- 期望风格: ${input.style}

请生成 ${total} 个极度详细、新手友好的拍摄方案。
其中：
- ${portraitCount} 个方案为 9:16 竖构图 (适合手机竖屏内容)；
- ${landscapeCount} 个方案为 16:9 横构图 (适合横屏视频 / 电影感)。

输出要求：
1）只输出合法 JSON，不要解释文字，不要代码块标记。
2）结构如下：

{
  "plans": [
    {
      "title": "方案标题，稍微有点电影感",
      "targetAspectRatio": "9:16 或 16:9",
      "imagePrompt": "英文草图提示词，用于生成黑白线稿构图草图",

      "focalLength": "例如：55mm",
      "aperture": "例如：F4.0",
      "shutterSpeed": "例如：1/160s",
      "iso": "例如：ISO 400",
      "whiteBalance": "例如：日光 / 阴天 / 5500K",
      "colorTint": "色调微调描述",

      "distance": "与模特距离，例如：1.5 米",
      "angle": "拍摄角度描述，例如：略微仰拍",

      "lightingGuide": "一步一步告诉新手模特该站在哪、光从哪里来",
      "compositionGuide": "一步一步告诉新手主体放在哪里、留多少空间",
      "photographerPosition": "一步一步告诉摄影师自己站哪、是否半蹲 / 走几步",

      "poseAction": "身体动作 / 姿态",
      "poseEyes": "眼神与头部方向",
      "modelDirecting": "你对模特说的话，直接写台词",
      "expertAdvice": "额外的小技巧，可提高成片率"
    }
  ]
}
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
    throw new Error("模型返回非合法 JSON，请打开浏览器控制台查看详细日志");
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
