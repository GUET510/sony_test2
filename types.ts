
export interface ShootingPlan {
  title: string;
  imagePrompt: string;
  poseAction: string;
  poseEyes: string;
  focalLength: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  whiteBalance: string;
  colorTint: string; // 色调偏移
  distance: string; // 拍摄距离
  angle: string; // 拍摄角度
  expertAdvice: string;
  targetAspectRatio: string; // "9:16" | "16:9"
  
  // New detailed fields for beginner-friendly guidance
  compositionGuide: string; // 具体构图指导 (e.g. "把人物放在右侧三分线")
  lightingGuide: string; // 具体布光/站位指导 (e.g. "让阳光打在左脸")
  photographerPosition: string; // 摄影师的具体动作 (e.g. "半蹲，平视")
  modelDirecting: string; // 具体的话术 (e.g. "告诉模特：'看向左边肩膀'")
}

export interface UserInput {
  person: string;
  location: string;
  environment: string;
  style: string;
  portraitCount: number;
  landscapeCount: number;
}

export enum LoadingState {
  IDLE = 'IDLE',
  GENERATING_TEXT = 'GENERATING_TEXT',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
