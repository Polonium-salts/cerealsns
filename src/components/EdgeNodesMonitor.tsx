import React, { useState, useEffect } from 'react';
import { X, Globe, Zap, Cpu, RefreshCw, Activity, ShieldCheck, CheckCircle2, Server } from 'lucide-react';
import type { EdgeNode } from '../types';
import { fetchEdgeNodes } from '../lib/api';

interface EdgeNodesMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (node: EdgeNode) => void;
  activeNode: EdgeNode | null;
}

export const EdgeNodesMonitor: React.FC<EdgeNodesMonitorProps> = ({
  isOpen,
  onClose,
  onSelectNode,
  activeNode,
}) => {
  const [nodes, setNodes] = useState<EdgeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<number>(Date.now());

  const refreshNodes = async () => {
    setIsLoading(true);
    const data = await fetchEdgeNodes();
    setNodes(data.nodes);
    setLastPingTime(Date.now());
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      refreshNodes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800/50">
              <Globe className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>EdgeOne & Cloudflare 边缘计算节点监视器</span>
              </h2>
              <p className="text-xs text-slate-400">
                全球 5 大核心 Edge 边缘加速代理，实现低延迟并发 SearXNG 抓取与 SSE 传输
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
            <div className="text-[11px] text-slate-400">平均边缘 RTT 延迟</div>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">22 ms</div>
            <div className="text-[10px] text-slate-500 mt-0.5">比中心化机房提速 74%</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
            <div className="text-[11px] text-slate-400">Edge 静态缓存命中率</div>
            <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">88.4%</div>
            <div className="text-[10px] text-slate-500 mt-0.5">EdgeOne Smart Cache</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
            <div className="text-[11px] text-slate-400">当前并发请求管道</div>
            <div className="text-lg font-bold text-indigo-400 font-mono mt-0.5">619 req/s</div>
            <div className="text-[10px] text-slate-500 mt-0.5">全球节点多路复用</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
            <div className="text-[11px] text-slate-400">智能故障自动转移</div>
            <div className="text-lg font-bold text-purple-400 font-mono mt-0.5">100% 连通</div>
            <div className="text-[10px] text-slate-500 mt-0.5">容错重试机制</div>
          </div>
        </div>

        {/* Nodes Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-200">边缘节点实时测速与路由选择</span>
            <button
              onClick={refreshNodes}
              disabled={isLoading}
              className="flex items-center space-x-1.5 text-cyan-400 hover:text-cyan-300 font-medium disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>重新测速</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {nodes.map((node) => {
              const isSelected = activeNode?.id === node.id;
              const isOptimal = node.latencyMs < 30;
              return (
                <div
                  key={node.id}
                  onClick={() => onSelectNode(node)}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-950/30 shadow-md shadow-cyan-500/10'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs ${
                      node.provider === 'EdgeOne' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {node.countryCode}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white">{node.name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          node.provider === 'EdgeOne' ? 'bg-indigo-900/80 text-indigo-200' : 'bg-amber-900/80 text-amber-200'
                        }`}>
                          {node.provider}
                        </span>
                        {isOptimal && (
                          <span className="rounded bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 text-[10px]">
                            最佳推荐
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        位置: {node.location} · 缓存命中: {(node.cacheHitRatio * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right font-mono">
                      <div className={`text-sm font-bold ${node.latencyMs < 35 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {node.latencyMs} ms
                      </div>
                      <div className="text-[10px] text-slate-500">RTT Ping</div>
                    </div>

                    <button
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {isSelected ? '已设为默认' : '锁定此节点'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 text-right">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            完成关闭
          </button>
        </div>

      </div>
    </div>
  );
};
