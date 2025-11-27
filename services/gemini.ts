import { GoogleGenAI, Type } from "@google/genai";
import { ShootingPlan, UserInput } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const generateShootingPlans = async (input: UserInput): Promise<ShootingPlan[]> => {
  try {
    const prompt = `
      背景信息:
      人物: ${input.person}
      地点: ${input.location}
      环境: ${input.environment}
      期望风格: ${input.style}

      请生成 6 个极度详细、新手友好的拍摄方案。
      方案 1-3: 9:16 竖构图。
      方案 4-6: 16:9 横构图。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
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
                  
                  // Detailed Guides (The "Beginner Friendly" Core)
                  lightingGuide: { type: Type.STRING, description: "傻瓜式布光/站位指令。e.g. '你站在阴影里，让模特站在阳光下，脸朝向光源'。" },
                  compositionGuide: { type: Type.STRING, description: "傻瓜式构图指令。e.g. '把模特放在画面正中间，头顶留出一拳的距离'。" },
                  photographerPosition: { type: Type.STRING, description: "摄影师身体姿态。e.g. '蹲下，镜头与模特膝盖齐平，仰拍'。" },
                  
                  // Directing
                  poseAction: { type: Type.STRING, description: "模特动作描述" },
                  poseEyes: { type: Type.STRING, description: "模特眼神描述" },
                  modelDirecting: { type: Type.STRING, description: "具体的引导剧本。e.g. '说：深吸气，看向我的镜头，假装你在生气'。" },
                  
                  expertAdvice: { type: Type.STRING, description: "一句话的点睛之笔/避坑指南" },
                },
                required: [
                  "title", "targetAspectRatio", "imagePrompt", 
                  "focalLength", "aperture", "shutterSpeed", "iso", "whiteBalance", "colorTint",
                  "distance", "angle",
                  "lightingGuide", "compositionGuide", "photographerPosition",
                  "poseAction", "poseEyes", "modelDirecting",
                  "expertAdvice"
                ],
              },
            },
          },
        },
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    return data.plans || [];

  } catch (error) {
    console.error("Error generating text plans:", error);
    throw error;
  }
};

export const generateSketch = async (prompt: string, aspectRatio: string): Promise<string | null> => {
  try {
    // Ensure aspectRatio is one of the supported values
    const validRatio = aspectRatio === '16:9' ? '16:9' : '9:16';
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
         imageConfig: {
           aspectRatio: validRatio
         }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating sketch:", error);
    return null;
  }
};