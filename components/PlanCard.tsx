import React, { useEffect, useState } from 'react';
import { ShootingPlan } from '../types';
import { generateSketch } from '../services/gemini';
import { 
  Camera, Aperture, Timer, Sun, Eye, 
  Navigation, Palette, Ruler, Scan, 
  Lightbulb, Grid3X3, MessageCircle, Footprints,
  Smartphone, MonitorPlay
} from 'lucide-react';

interface PlanCardProps {
  plan: ShootingPlan;
  index: number;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, index }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      setLoadingImage(true);
      const url = await generateSketch(plan.imagePrompt, plan.targetAspectRatio);
      if (isMounted) {
        setImageUrl(url);
        setLoadingImage(false);
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [plan.imagePrompt, plan.targetAspectRatio]);

  const isVertical = plan.targetAspectRatio === '9:16';

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full ring-1 ring-white/5">
      {/* Header */}
      <div className="bg-neutral-950 px-5 py-4 border-b border-neutral-800 flex justify-between items-center">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <span className="text-orange-500 text-xs font-bold tracking-widest uppercase">方案 0{index + 1}</span>
             <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${isVertical ? 'border-blue-900/50 text-blue-400 bg-blue-900/10' : 'border-purple-900/50 text-purple-400 bg-purple-900/10'} flex items-center gap-1`}>
                {isVertical ? <Smartphone className="w-3 h-3" /> : <MonitorPlay className="w-3 h-3" />}
                {plan.targetAspectRatio}
             </span>
           </div>
           <h3 className="text-xl font-bold text-neutral-100 tracking-tight">{plan.title}</h3>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-neutral-500 font-mono border border-neutral-800 px-1.5 py-0.5 rounded mb-1">A7R3</span>
          <span className="text-[10px] text-neutral-500 font-mono border border-neutral-800 px-1.5 py-0.5 rounded">24-70 F4</span>
        </div>
      </div>

      {/* Visual Guide (Image) */}
      <div className={`relative w-full ${isVertical ? 'aspect-[9/16]' : 'aspect-video'} bg-white border-b border-neutral-800 group`}>
        {loadingImage ? (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-neutral-300 border-t-orange-500 rounded-full animate-spin"></div>
              <span className="text-xs text-neutral-500 font-mono tracking-widest">正在绘制{isVertical ? '竖屏' : '横屏'}草图...</span>
            </div>
          </div>
        ) : imageUrl ? (
          <img 
            src={imageUrl} 
            alt={`Sketch for ${plan.title}`} 
            className="w-full h-full object-contain p-4 mix-blend-multiply transition-transform duration-700 group-hover:scale-105" 
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-400 bg-neutral-100">
            <span className="text-sm">图片生成失败</span>
          </div>
        )}
        <div className="absolute top-4 left-4">
             <span className="bg-black/80 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1">
               <Grid3X3 className="w-3 h-3" /> 构图参考
             </span>
        </div>
      </div>

      {/* Actionable Steps Container */}
      <div className="flex-1 flex flex-col divide-y divide-neutral-800">
        
        {/* Step 1: The Setup (Environment & Settings) */}
        <div className="p-5 space-y-4">
           <h4 className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-widest">
             <span className="bg-orange-500/10 text-orange-500 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">1</span>
             环境与参数设置
           </h4>
           
           <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-800 flex items-start gap-3">
             <Lightbulb className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
             <div>
               <div className="text-neutral-300 text-sm font-medium mb-1">傻瓜式布光</div>
               <div className="text-neutral-400 text-sm leading-relaxed">{plan.lightingGuide}</div>
             </div>
           </div>

           {/* Tech Settings Grid */}
           <div className="grid grid-cols-4 gap-2">
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800 text-center">
                 <div className="text-[10px] text-neutral-500 mb-1">焦段</div>
                 <div className="text-orange-400 font-mono font-bold text-xs md:text-sm">{plan.focalLength}</div>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800 text-center">
                 <div className="text-[10px] text-neutral-500 mb-1">光圈</div>
                 <div className="text-white font-mono font-bold text-xs md:text-sm">{plan.aperture}</div>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800 text-center">
                 <div className="text-[10px] text-neutral-500 mb-1">快门</div>
                 <div className="text-white font-mono font-bold text-xs md:text-sm">{plan.shutterSpeed}</div>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800 text-center">
                 <div className="text-[10px] text-neutral-500 mb-1">ISO</div>
                 <div className="text-white font-mono font-bold text-xs md:text-sm">{plan.iso}</div>
              </div>
              {/* Secondary Settings Row */}
              <div className="col-span-2 bg-neutral-950 px-3 py-2 rounded border border-neutral-800 flex justify-between items-center">
                 <span className="text-[10px] text-neutral-500">白平衡</span>
                 <span className="text-neutral-300 font-mono text-xs">{plan.whiteBalance}</span>
              </div>
              <div className="col-span-2 bg-neutral-950 px-3 py-2 rounded border border-neutral-800 flex justify-between items-center">
                 <span className="text-[10px] text-neutral-500">色调偏移</span>
                 <span className="text-neutral-300 font-mono text-xs">{plan.colorTint}</span>
              </div>
           </div>
        </div>

        {/* Step 2: The Composition (Where to stand & How to frame) */}
        <div className="p-5 space-y-4 bg-neutral-900/50">
           <h4 className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-widest">
             <span className="bg-orange-500/10 text-orange-500 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">2</span>
             构图与机位
           </h4>

           <div className="space-y-3">
             <div className="flex gap-3">
                <Footprints className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                   <span className="text-neutral-300 font-medium">摄影师保姆级站位：</span>
                   <span className="text-neutral-400 ml-1">{plan.photographerPosition}</span>
                   <div className="flex gap-4 mt-1.5 text-xs font-mono text-neutral-500">
                      <span className="flex items-center gap-1"><Ruler className="w-3 h-3"/> 距离 {plan.distance}</span>
                      <span className="flex items-center gap-1"><Scan className="w-3 h-3"/> {plan.angle}</span>
                   </div>
                </div>
             </div>
             
             <div className="flex gap-3">
                <Grid3X3 className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                   <span className="text-neutral-300 font-medium">手把手构图：</span>
                   <span className="text-neutral-400 ml-1">{plan.compositionGuide}</span>
                </div>
             </div>
           </div>
        </div>

        {/* Step 3: The Director (What to say) */}
        <div className="p-5 space-y-4">
           <h4 className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-widest">
             <span className="bg-orange-500/10 text-orange-500 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">3</span>
             引导与互动
           </h4>

           <div className="space-y-3">
              {/* The Script */}
              <div className="bg-neutral-800 rounded-lg p-4 relative border border-neutral-700">
                <div className="absolute -top-2.5 left-3 bg-neutral-700 text-neutral-300 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider flex items-center gap-1">
                   <MessageCircle className="w-3 h-3" /> 照着念
                </div>
                <p className="text-orange-200/90 italic font-serif text-lg leading-relaxed">
                  "{plan.modelDirecting}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                 <div>
                    <div className="text-[10px] text-neutral-500 uppercase mb-1">肢体动作</div>
                    <div className="text-sm text-neutral-300">{plan.poseAction}</div>
                 </div>
                 <div>
                    <div className="text-[10px] text-neutral-500 uppercase mb-1">眼神方向</div>
                    <div className="text-sm text-neutral-300">{plan.poseEyes}</div>
                 </div>
              </div>
           </div>
        </div>
        
        {/* Footer: Expert Tip */}
        <div className="p-4 bg-orange-950/20 border-t border-orange-900/30">
          <div className="flex gap-3 items-start">
            <div className="bg-orange-500/20 p-1.5 rounded-full mt-0.5">
               <Navigation className="w-3 h-3 text-orange-400" />
            </div>
            <div>
              <p className="text-[10px] text-orange-500/80 uppercase font-bold tracking-wider mb-1">避坑指南</p>
              <p className="text-sm text-orange-100/80">{plan.expertAdvice}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlanCard;