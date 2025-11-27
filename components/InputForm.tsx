import React, { useState } from 'react';
import { UserInput, LoadingState } from '../types';
import { Aperture, Sparkles } from 'lucide-react';

interface InputFormProps {
  onSubmit: (input: UserInput) => void;
  loadingState: LoadingState;
}

const PRESETS = {
  person: [
    "长发白裙女生", "日系JK制服", "情绪感特写", "甜蜜情侣", "活泼儿童", "西装职场人"
  ],
  location: [
    "公园草地", "城市天台", "复古街道", "极简咖啡店", "海边沙滩", "纯色背景墙"
  ],
  environment: [
    "夕阳逆光", "阴天柔光", "树影斑驳", "窗边侧光", "夜晚霓虹", "室内暖灯"
  ],
  style: [
    "日系清新", "王家卫电影感", "法式慵懒", "港风复古", "高冷极简", "情绪胶片"
  ]
};

const InputForm: React.FC<InputFormProps> = ({ onSubmit, loadingState }) => {
  const [input, setInput] = useState<UserInput>({
    person: '',
    location: '',
    environment: '',
    style: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const handlePresetClick = (field: keyof UserInput, value: string) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingState === LoadingState.IDLE || loadingState === LoadingState.COMPLETE || loadingState === LoadingState.ERROR) {
        onSubmit(input);
    }
  };

  const isGenerating = loadingState === LoadingState.GENERATING_TEXT || loadingState === LoadingState.GENERATING_IMAGES;

  return (
    <div className="w-full max-w-4xl mx-auto mb-10">
      <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Person Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-neutral-400 uppercase tracking-wider flex justify-between">
                拍摄主体 (人物)
                <Sparkles className="w-3 h-3 text-orange-500" />
            </label>
            <input
              type="text"
              name="person"
              placeholder="例如：身穿红裙的年轻女子"
              required
              value={input.person}
              onChange={handleChange}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
            <div className="flex flex-wrap gap-2">
                {PRESETS.person.map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        onClick={() => handlePresetClick('person', preset)}
                        className="text-[10px] md:text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition border border-neutral-700/50"
                    >
                        {preset}
                    </button>
                ))}
            </div>
          </div>

          {/* Location Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-neutral-400 uppercase tracking-wider flex justify-between">
                拍摄地点
                <Sparkles className="w-3 h-3 text-orange-500" />
            </label>
            <input
              type="text"
              name="location"
              placeholder="例如：老图书馆"
              required
              value={input.location}
              onChange={handleChange}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
            <div className="flex flex-wrap gap-2">
                {PRESETS.location.map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        onClick={() => handlePresetClick('location', preset)}
                        className="text-[10px] md:text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition border border-neutral-700/50"
                    >
                        {preset}
                    </button>
                ))}
            </div>
          </div>

          {/* Environment Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-neutral-400 uppercase tracking-wider flex justify-between">
                环境与光线
                <Sparkles className="w-3 h-3 text-orange-500" />
            </label>
            <input
              type="text"
              name="environment"
              placeholder="例如：透过窗户的夕阳"
              required
              value={input.environment}
              onChange={handleChange}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
             <div className="flex flex-wrap gap-2">
                {PRESETS.environment.map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        onClick={() => handlePresetClick('environment', preset)}
                        className="text-[10px] md:text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition border border-neutral-700/50"
                    >
                        {preset}
                    </button>
                ))}
            </div>
          </div>

          {/* Style Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-neutral-400 uppercase tracking-wider flex justify-between">
                期望风格
                <Sparkles className="w-3 h-3 text-orange-500" />
            </label>
            <input
              type="text"
              name="style"
              placeholder="例如：忧郁、电影感"
              required
              value={input.style}
              onChange={handleChange}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
             <div className="flex flex-wrap gap-2">
                {PRESETS.style.map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        onClick={() => handlePresetClick('style', preset)}
                        className="text-[10px] md:text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition border border-neutral-700/50"
                    >
                        {preset}
                    </button>
                ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isGenerating}
            className={`
              flex items-center gap-3 px-8 py-3 rounded-full font-bold text-sm tracking-wide transition-all
              ${isGenerating 
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' 
                : 'bg-orange-600 hover:bg-orange-500 text-white hover:shadow-lg hover:shadow-orange-500/20 active:scale-95'}
            `}
          >
            {isGenerating ? (
               <>
                <div className="w-4 h-4 border-2 border-neutral-500 border-t-white rounded-full animate-spin"></div>
                <span>正在设计方案...</span>
               </>
            ) : (
               <>
                <Aperture className="w-5 h-5" />
                <span>生成拍摄方案</span>
               </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputForm;
