import { Type } from "@google/genai";
import { ShootingPlan, UserInput } from "../types";

const API_KEY = process.env.API_KEY;
const NEWAPI_BASE_URL = process.env.NEWAPI_BASE_URL || "https://api.gemai.cc";
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "[满血A]gemini-3-pro-preview-thinking";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

const SYSTEM_INSTRUCTION = `
你是一位拥有 20 年经验的顶级人像摄影导师，你正在指导一位**完全不懂摄影的新手**使用 **Sony A7R3** 和 **24-70mm F4** 镜头拍出大片。

你的任务是基于用户输入设计 **6 组**“保姆级”拍摄方案：
1. **前 3 组**：必须是 **9:16 竖构图** (适合手机/社媒)。
2. **后 3 组**：必须是 **16:9 横构图** (电影感/故事感)。

**器材硬件约束：**
1. **镜头限制**：最大光圈 **F4.0**。若需虚化，强制建议使用 **50mm-70mm** 长焦端并靠近拍摄。
2. **高画质优势**：利用 4240 万像素优势，构图可以稍松，便于后期裁切。
3. **防抖**：利用机身防抖，静态拍摄快门可低至 1/60s。

**核心要求 - 必须让新手“照着做就能火”：**
- **构图指导 (compositionGuide)**：禁止使用抽象词汇。必须说“打开相机的九宫格线，把模特的左眼放在右上角的交叉点上”或“让地平线位于画面下三分之一处”。
- **光线指导 (lightingGuide)**：禁止只说“顺光/逆光”。必须说“让模特站在窗户前1米处，脸转向窗户45度”或“让阳光从模特头发后面照过来，形成发光轮廓”。
- **摄影师机位 (photographerPosition)**：必须极度具体。例如：“不要站着拍！单膝跪地，把相机举到胸口高度，屏幕翻折向上看”或“站在椅子上俯拍”。
- **沟通话术 (modelDirecting)**：提供一句具体的**台词**。例如：“不要说‘笑一下’，要说：‘想象你刚刚在街角偶遇了暗恋的人’”。

**输出格式：**
返回 JSON 对象数组。
"imagePrompt" 用于生成草图，保持 minimalist black and white line drawing sketch 风格。
所有指导性文字必须用**中文**，语气鼓励、清晰、极其具体，像在手把手教。
`;

// 通用调用 NewAPI Google Gemini GenerateContent 的封装
async function callGeminiGenerateContent(model: string, body: any): Promise<any> {
  if (!API_KEY) {
    throw new Error("环境变量 GEMINI_API_KEY / API_KEY 未配置");
  }

  const baseUrl = NEWAPI_BASE_URL.replace(/\/$/, "") || "https://api.gemai.cc";
  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(API_KEY)}`;

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

  const data = await res.json();
  return data;
}

// 生成文本拍摄方案（JSON）
export const generateShootingPlans = async (input: UserInput): Promise<ShootingPlan[]> => {
  // 这里保持你原来的 prompt 结构
  const prompt = `
      背景信息:
      人物: ${input.person}
      地点: ${input.location}
      环境: ${input.environment}
      期望风格: ${input.style}

      请生成 6 个极度详细、新手友好的拍摄方案。
      方案 1-3: 9:16 竖构图。
      方案 4-6: 16:9 横构图。

      要求：
      1. 所有机位、动作、构图，都必须让完全不懂摄影的人，照着做也能拍出“不丑的片子”。
      2. 每个方案都要给出：镜头焦段、光圈、快门、ISO、白平衡、色调、机位、距离、角度、模特表情与动作、构图建议、场景利用方式。
      3. 每个方案都要有一个「名称」，带一点电影感或故事感。 
  `;

  const body = {
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
      response_schema: {
        type: Type.OBJECT,
        properties: {
          plans: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "方案名称，具有艺术感" },
                targetAspectRatio: { type: Type.STRING, description: "构图比例，必须是 '9:16' 或 '16:9'" },
                imagePrompt: { type: Type.STRING, description: "英文草图提示词" },

                // Camera Settings
                focalLength: { type: Type.STRING, description: "具体焦段 (e.g., 55mm)" },
                aperture: { type: Type.STRING, description: "光圈 (F4.0 - F11)" },
                shutterSpeed: { type: Type.STRING, description: "快门速度" },
                iso: { type: Type.STRING, description: "ISO 数值" },
                whiteBalance: { type: Type.STRING, description: "白平衡模式或K值" },
                colorTint: { type: Type.STRING, description: "色调漂移 (e.g. M1 A2)" },

                // Execution Guide
                distance: { type: Type.STRING, description: "与模特的精确距离 (e.g., 1.5米)" },
                angle: { type: Type.STRING, description: "拍摄角度简述 (e.g., 低角度)" },

                // Detailed Guides
                lightingGuide: { type: Type.STRING, description: "傻瓜式布光/站位指令。" },
                compositionGuide: { type: Type.STRING, description: "傻瓜式构图指令。" },
                photographerPosition: { type: Type.STRING, description: "摄影师如何走位、移动机位。" },

                poseAction: { type: Type.STRING, description: "模特身体动作说明。" },
                poseEyes: { type: Type.STRING, description: "眼神与头部方向说明。" },
                modelDirecting: { type: Type.STRING, description: "你要如何用口语话术指挥模特。" },

                expertAdvice: { type: Type.STRING, description: "结合场景的进阶建议，可以提高 20% 成片率。" },
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

  const data = await callGeminiGenerateContent(TEXT_MODEL, body);

  const textParts =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(textParts);
  } catch (e) {
    console.error("解析 JSON 失败，原始内容：", textParts);
    throw new Error("模型返回非合法 JSON，请检查提示词或稍后重试");
  }

  return (parsed.plans || []) as ShootingPlan[];
};

// 生成草图（返回 base64 data URL）
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
              text: `${prompt}\n\n请按照 ${validRatio} 比例生成一张 black and white 线稿草图，简洁、构图清晰，方便新手理解画面结构。`,
            },
          ],
        },
      ],
    };

    const data = await callGeminiGenerateContent(IMAGE_MODEL, body);

    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      const inline = (part as any).inline_data || (part as any).inlineData;
      if (inline && inline.data) {
        const mimeType = inline.mime_type || inline.mimeType || "image/png";
        return `data:${mimeType};base64,${inline.data}`;
      }
    }

    return null;
  } catch (error) {
    console.error("Error generating sketch:", error);
    return null;
  }
};
