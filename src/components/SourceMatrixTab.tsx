import React from 'react';
import { Layers, Activity, PieChart, BarChart3, Globe, Zap, Database } from 'lucide-react';
import type { SearchResponse } from '../types';

interface SourceMatrixTabProps {
  searchData: SearchResponse | null;
}

export const SourceMatrixTab: React.FC<SourceMatrixTabProps> = ({ searchData }) => {
  if (!searchData || !searchData.results.length) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-10 text-center my-6">
        <Activity className="h-10 w-10 text-slate-600 mx-auto mb-2" />
        <p className="text-xs text-slate-400">请先执行一次搜索，系统将生成多引擎覆盖率与网络延迟对比矩阵</p>
      </div>
    );
  }

  const { results, stats, enginesUsed } = searchData;

  // Domain breakdown calculation
  const domainCounts: Record<string, number> = {};
  results.forEach((r) => {
    try {
      const domain = new URL(r.url).hostname;
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    } catch {}
  });

  const sortedDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-6 my-6">
      
      {/* Top Engine Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5 font-semibold text-slate-200">
              <Database className="h-4 w-4 text-cyan-400" />
              <span>涵盖搜索引擎数量</span>
            </span>
            <span className="font-mono text-cyan-300 font-bold">{enginesUsed.length} 个引擎</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {enginesUsed.map((eng) => (
              <span key={eng} className="rounded-md bg-slate-950 px-2 py-0.5 text-[11px] font-medium text-cyan-300 border border-slate-800">
                {eng}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5 font-semibold text-slate-200">
              <Zap className="h-4 w-4 text-emerald-400" />
              <span>Edge 边缘加速节点</span>
            </span>
            <span className="font-mono text-emerald-300 font-bold">{stats.edgeNode}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            耗时: <span className="text-emerald-400 font-mono font-bold">{stats.fetchTimeMs} ms</span> · 缓存命中: {stats.cacheHit ? '是' : '否'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5 font-semibold text-slate-200">
              <Globe className="h-4 w-4 text-indigo-400" />
              <span>涵盖主要顶级域名</span>
            </span>
            <span className="font-mono text-indigo-300 font-bold">{Object.keys(domainCounts).length} 个域名</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1">
            {sortedDomains.map(([d]) => d).join(', ')}
          </p>
        </div>

      </div>

      {/* Engine Latency & Coverage Matrix Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          <span>SearXNG 引擎响应速度与结果分布图表</span>
        </h3>

        <div className="space-y-3">
          {stats.engineBreakdown.map((item) => {
            const percentage = Math.round((item.count / results.length) * 100);
            return (
              <div key={item.engine} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{item.engine}</span>
                  <span className="text-slate-400 font-mono">{item.count} 条结果 ({percentage}%) · 延迟 ~{item.avgLatencyMs}ms</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                    style={{ width: `${Math.max(8, percentage)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
