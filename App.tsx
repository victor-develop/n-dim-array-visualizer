import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Point3D } from './types';
import { generateNDimArray, flattenTo3D } from './services/arrayGenerator';
import Visualizer3D from './components/Visualizer3D';

type Lang = 'zh' | 'en';

const translations = {
  zh: {
    title: '多维空间可视化',
    subtitle: 'N-维递归投影引擎',
    dimension: '维度数量 (N)',
    size: '单维跨度 (Size)',
    regenerate: '生成随机数组',
    calculating: '正在计算路径...',
    nodes: '活动节点',
    engineStatus: '引擎状态',
    operational: '运行正常',
    projection: '投影逻辑',
    d1d3: 'D1-D3 映射至主坐标轴',
    d4plus: 'D4+ 递归局部偏移',
    colorScale: '数值映射至色彩空间',
    inspector: '单元格观测',
    value: '数值',
    path: '索引路径',
    limitMsg: '数据量超过上限 (30k)，请降低维度或大小。'
  },
  en: {
    title: 'N-Dim Visualizer',
    subtitle: 'Recursive Projection Engine',
    dimension: 'Dimensions (N)',
    size: 'Size per Dim',
    regenerate: 'Regenerate Array',
    calculating: 'Calculating...',
    nodes: 'Active Nodes',
    engineStatus: 'ENGINE STATUS',
    operational: 'OPERATIONAL',
    projection: 'Projection Logic',
    d1d3: 'D1-D3 mapped to Main Axes',
    d4plus: 'D4+ recursive offsets',
    colorScale: 'Value drives color hue',
    inspector: 'Cell Inspector',
    value: 'VALUE',
    path: 'Index Path',
    limitMsg: 'Volume over limit (30k). Please reduce N or Size.'
  }
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Lang>('zh');
  const [n, setN] = useState<number>(3);
  const [dimSize, setDimSize] = useState<number>(4);
  const [points, setPoints] = useState<Point3D[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<Point3D | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const t = translations[lang];

  const regenerate = useCallback(() => {
    setIsLoading(true);
    const totalPoints = Math.pow(dimSize, n);
    
    if (totalPoints > 30000) {
      alert(t.limitMsg);
      setIsLoading(false);
      return;
    }

    const dims = Array(n).fill(dimSize);
    const multiDim = generateNDimArray(dims);
    const flatPoints = flattenTo3D(multiDim, [], dims);
    setPoints(flatPoints);
    
    setTimeout(() => setIsLoading(false), 150);
  }, [n, dimSize, t.limitMsg]);

  useEffect(() => {
    regenerate();
  }, []);

  const totalPointsCount = useMemo(() => Math.pow(dimSize, n), [n, dimSize]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020617] text-slate-100 flex flex-col">
      <div className="absolute inset-0 z-0">
        <Visualizer3D points={points} onHover={setHoveredPoint} />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 pointer-events-none flex justify-between items-start">
        <div className="pointer-events-auto flex items-start gap-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <span className="text-2xl font-black italic">N</span>
             </div>
             <div>
                <h1 className="text-2xl font-black tracking-tighter text-white leading-none">{t.title}</h1>
                <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-[0.3em] mt-1">{t.subtitle}</p>
             </div>
          </div>
          <button 
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="px-3 py-1 glass rounded-full text-[10px] font-bold tracking-widest uppercase hover:bg-white/10 transition-colors pointer-events-auto"
          >
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
        </div>

        {/* Inspector Panel */}
        {hoveredPoint && (
          <div className="pointer-events-auto glass p-5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 min-w-[260px] border-indigo-500/20">
            <div className="text-[10px] font-black text-indigo-400 uppercase mb-3 flex justify-between items-center">
              <span>{t.inspector}</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-mono font-black text-white">{hoveredPoint.value.toFixed(5)}</span>
              <span className="text-slate-500 text-[10px] font-bold">{t.value}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="text-[9px] text-slate-500 uppercase font-black mb-2">{t.path}</div>
              <div className="flex gap-1.5 flex-wrap">
                {(hoveredPoint.metadata.path as number[]).map((idx, i) => (
                  <div key={i} className="px-2 py-0.5 bg-indigo-500/10 rounded text-indigo-300 text-[10px] font-mono border border-indigo-500/20">
                    d{i} <span className="text-white font-bold ml-1">{idx}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Card */}
      <div className="absolute left-8 bottom-8 w-80 z-20 pointer-events-auto flex flex-col gap-4">
        <div className="glass p-6 rounded-3xl shadow-2xl space-y-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.dimension}</span>
                <span className="text-xl font-mono font-black text-indigo-400">{n}</span>
              </div>
              <input 
                type="range" min="1" max="8" step="1" 
                value={n} 
                onChange={(e) => setN(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.size}</span>
                <span className="text-xl font-mono font-black text-emerald-400">{dimSize}</span>
              </div>
              <input 
                type="range" min="2" max="25" step="1" 
                value={dimSize} 
                onChange={(e) => setDimSize(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          <button 
            onClick={regenerate}
            disabled={isLoading}
            className="group relative w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 overflow-hidden"
          >
            <span className="relative z-10">{isLoading ? t.calculating : t.regenerate}</span>
          </button>

          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{t.engineStatus}</span>
            <span className="text-[9px] font-mono text-emerald-500 font-bold">{t.operational}</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl flex justify-between items-center px-5">
           <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t.nodes}</span>
           <span className="text-sm font-mono font-bold text-white">{totalPointsCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Logic Legend */}
      <div className="absolute right-8 bottom-8 hidden lg:block pointer-events-none">
        <div className="glass p-5 rounded-2xl border-white/5 text-right">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">{t.projection}</div>
          <div className="space-y-3">
             <div className="text-[11px] text-slate-400 flex items-center justify-end gap-3">
               <span>{t.d1d3}</span>
               <div className="w-2.5 h-2.5 bg-indigo-500 rounded-sm shadow-sm"></div>
             </div>
             <div className="text-[11px] text-slate-400 flex items-center justify-end gap-3">
               <span>{t.d4plus}</span>
               <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm shadow-sm"></div>
             </div>
             <div className="text-[11px] text-slate-400 flex items-center justify-end gap-3">
               <span>{t.colorScale}</span>
               <div className="w-2.5 h-2.5 bg-pink-500 rounded-sm shadow-sm"></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;