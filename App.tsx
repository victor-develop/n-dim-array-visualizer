import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Point3D } from './types';
import { generateNDimArray, flattenTo3D } from './services/arrayGenerator';
import Visualizer3D from './components/Visualizer3D';

type Lang = 'zh' | 'en';

const i18n = {
  zh: {
    title: '多维格子可视化',
    subtitle: '空间递归投影引擎',
    dimension: '维度数量 (N)',
    size: '单维大小 (Size)',
    regenerate: '重新生成随机数组',
    calculating: '正在投影数据...',
    nodes: '活动节点总数',
    status: '引擎状态',
    online: '运行正常',
    inspector: '单元格观察器',
    value: '数值',
    path: '索引路径 (坐标系)',
    labels: '数值标签',
    on: '开启',
    off: '关闭',
    limit: '数据量过大 (>30k)，已自动限制。'
  },
  en: {
    title: 'N-Dim Visualizer',
    subtitle: 'Spatial Projection Engine',
    dimension: 'Dimensions (N)',
    size: 'Dim Size',
    regenerate: 'Regenerate Array',
    calculating: 'Projecting Data...',
    nodes: 'Total Nodes',
    status: 'Engine Status',
    online: 'OPERATIONAL',
    inspector: 'Cell Inspector',
    value: 'VALUE',
    path: 'Index Path (Coords)',
    labels: 'World Labels',
    on: 'ON',
    off: 'OFF',
    limit: 'Volume too large (>30k), limited.'
  }
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Lang>('zh');
  const [n, setN] = useState<number>(3);
  const [dimSize, setDimSize] = useState<number>(4);
  const [points, setPoints] = useState<Point3D[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<Point3D | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(false);

  const t = i18n[lang];

  const regenerate = useCallback(() => {
    setIsLoading(true);
    const count = Math.pow(dimSize, n);
    if (count > 30000) {
      alert(t.limit);
      setIsLoading(false);
      return;
    }

    const dims = Array(n).fill(dimSize);
    const multiDim = generateNDimArray(dims);
    const flatPoints = flattenTo3D(multiDim, [], dims);
    setPoints(flatPoints);
    setTimeout(() => setIsLoading(false), 200);
  }, [n, dimSize, t.limit]);

  useEffect(() => {
    regenerate();
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans">
      <div className="absolute inset-0 z-0">
        <Visualizer3D points={points} onHover={setHoveredPoint} showLabels={showLabels} />
      </div>

      {/* Header & Branding */}
      <div className="absolute top-0 left-0 p-8 z-10 pointer-events-none flex flex-col gap-2">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
            <span className="text-2xl font-black italic">N</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white leading-none text-glow">{t.title}</h1>
            <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-[0.3em] mt-1">{t.subtitle}</p>
          </div>
          <button 
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="ml-4 px-3 py-1 glass rounded-full text-[10px] font-bold tracking-widest hover:bg-white/10 transition-all pointer-events-auto border-white/10"
          >
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
        </div>
      </div>

      {/* Cell Inspector HUD (Top Right) */}
      <div className="absolute top-0 right-0 p-8 z-10 pointer-events-none">
        {hoveredPoint && (
          <div className="pointer-events-auto glass p-6 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300 min-w-[280px] border-indigo-500/20">
            <div className="text-[10px] font-black text-indigo-400 uppercase mb-3 flex justify-between items-center tracking-widest">
              <span>{t.inspector}</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-mono font-black text-white">{hoveredPoint.value.toFixed(4)}</span>
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">{t.value}</span>
            </div>

            <div className="mt-6 pt-5 border-t border-white/5 space-y-3">
              <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{t.path}</div>
              <div className="flex gap-2 flex-wrap">
                {(hoveredPoint.metadata.path as number[]).map((idx, i) => (
                  <div key={i} className="px-2 py-1 bg-indigo-500/10 rounded-md text-indigo-300 text-[10px] font-mono border border-indigo-500/20">
                    d{i} <span className="text-white font-bold ml-1">{idx}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Controller (Bottom Left) */}
      <div className="absolute bottom-8 left-8 w-80 z-20 pointer-events-auto flex flex-col gap-4">
        <div className="glass p-6 rounded-3xl shadow-2xl space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.dimension}</span>
                <span className="text-xl font-mono font-black text-indigo-400">{n}</span>
              </div>
              <input 
                type="range" min="1" max="8" step="1" 
                value={n} onChange={(e) => setN(parseInt(e.target.value))}
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
                value={dimSize} onChange={(e) => setDimSize(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button 
              onClick={() => setShowLabels(!showLabels)}
              className={`flex justify-between items-center px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${showLabels ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-slate-800/30 border-white/5 text-slate-500 hover:text-white'}`}
            >
              <span>{t.labels}</span>
              <span className={`px-2 py-0.5 rounded ${showLabels ? 'bg-indigo-500 text-white' : 'bg-slate-700'}`}>{showLabels ? t.on : t.off}</span>
            </button>

            <button 
              onClick={regenerate}
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
            >
              {isLoading ? t.calculating : t.regenerate}
            </button>
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{t.status}</span>
            <span className="text-[9px] font-mono text-emerald-500 font-bold">{t.online}</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl flex justify-between items-center px-5">
           <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t.nodes}</span>
           <span className="text-sm font-mono font-bold text-white">{points.length.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default App;