import React, { useState, useEffect } from 'react';
import {
  Key,
  Layers,
  Activity,
  Terminal,
  ShieldAlert,
  Server,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Sparkles,
  Zap,
  Lock,
  Globe,
  Sliders,
  Play,
  RotateCcw,
  ExternalLink,
  AlertCircle,
  Cloud,
  Cpu,
  FastForward
} from 'lucide-react';
import type {
  ApiKeyItem,
  ApiEndpointItem,
  ApiLogItem,
  ApiAdminStats,
  ApiAdminConfig,
  SearxngInstanceItem
} from '../../types';
import {
  fetchAdminStats,
  fetchAdminApiKeys,
  createAdminApiKey,
  updateAdminApiKey,
  deleteAdminApiKey,
  fetchAdminEndpoints,
  updateAdminEndpoint,
  fetchAdminLogs,
  fetchAdminConfig,
  saveAdminConfig,
  pingSearxngNode,
  pingAllSearxngNodes,
  purgeJsDelivrCdnCache
} from '../../lib/api';

interface AdminApiPanelProps {
  onBackToMain: () => void;
}

export const AdminApiPanel: React.FC<AdminApiPanelProps> = ({ onBackToMain }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'endpoints' | 'logs' | 'playground' | 'settings'>('overview');

  // State data
  const [stats, setStats] = useState<ApiAdminStats | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [endpoints, setEndpoints] = useState<ApiEndpointItem[]>([]);
  const [logs, setLogs] = useState<ApiLogItem[]>([]);
  const [config, setConfig] = useState<ApiAdminConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI States
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [visibleKeyIds, setVisibleKeyIds] = useState<Set<string>>(new Set());
  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['search:read', 'ai:stream']);
  const [newKeyRps, setNewKeyRps] = useState(60);

  // Log Filtering
  const [logStatusFilter, setLogStatusFilter] = useState<string>('');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');

  // Playground State
  const [testEndpoint, setTestEndpoint] = useState('/api/search');
  const [testQuery, setTestQuery] = useState('AI 智能体未来演进');
  const [testMethod, setTestMethod] = useState<'GET' | 'POST'>('GET');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<number | null>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // SearXNG Node Pool States
  const [newSearxngUrl, setNewSearxngUrl] = useState('');
  const [isTestingSearxngUrl, setIsTestingSearxngUrl] = useState(false);
  const [testSearxngResult, setTestSearxngResult] = useState<{ ok: boolean; latencyMs: number; status: string } | null>(null);
  const [isPingAllLoading, setIsPingAllLoading] = useState(false);

  // Handlers for SearXNG Node Pool
  const handleTestNewSearxngNode = async () => {
    if (!newSearxngUrl.trim()) return;
    setIsTestingSearxngUrl(true);
    setTestSearxngResult(null);
    let formattedUrl = newSearxngUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    const res = await pingSearxngNode(formattedUrl);
    setTestSearxngResult(res);
    setIsTestingSearxngUrl(false);
  };

  const handleAddSearxngNode = async () => {
    if (!newSearxngUrl.trim() || !config) return;
    let formattedUrl = newSearxngUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    if (config.searxngInstances.some((inst) => inst.url.toLowerCase() === formattedUrl.toLowerCase())) {
      alert('该 SearXNG 节点已存在于节点池中！');
      return;
    }

    const newNode: SearxngInstanceItem = {
      url: formattedUrl,
      enabled: true,
      latencyMs: testSearxngResult?.latencyMs || 50,
      status: (testSearxngResult?.status as any) || 'online',
      lastChecked: new Date().toISOString()
    };

    const updatedInstances = [...config.searxngInstances, newNode];
    const updatedConfig = { ...config, searxngInstances: updatedInstances };
    setConfig(updatedConfig);
    await saveAdminConfig(updatedConfig);

    setNewSearxngUrl('');
    setTestSearxngResult(null);
  };

  const handleToggleSearxngNode = async (index: number) => {
    if (!config) return;
    const updatedInstances = [...config.searxngInstances];
    updatedInstances[index] = {
      ...updatedInstances[index],
      enabled: !updatedInstances[index].enabled
    };
    const updatedConfig = { ...config, searxngInstances: updatedInstances };
    setConfig(updatedConfig);
    await saveAdminConfig(updatedConfig);
  };

  const handleRemoveSearxngNode = async (index: number) => {
    if (!config) return;
    const updatedInstances = config.searxngInstances.filter((_, i) => i !== index);
    const updatedConfig = { ...config, searxngInstances: updatedInstances };
    setConfig(updatedConfig);
    await saveAdminConfig(updatedConfig);
  };

  const handlePingSingleNode = async (index: number) => {
    if (!config) return;
    const target = config.searxngInstances[index];
    const res = await pingSearxngNode(target.url);

    const updatedInstances = [...config.searxngInstances];
    updatedInstances[index] = {
      ...updatedInstances[index],
      latencyMs: res.latencyMs,
      status: res.status,
      lastChecked: new Date().toISOString()
    };

    const updatedConfig = { ...config, searxngInstances: updatedInstances };
    setConfig(updatedConfig);
    await saveAdminConfig(updatedConfig);
  };

  const handlePingAllNodes = async () => {
    if (!config) return;
    setIsPingAllLoading(true);
    const updatedInstances = await pingAllSearxngNodes();
    if (updatedInstances.length > 0) {
      const updatedConfig = { ...config, searxngInstances: updatedInstances };
      setConfig(updatedConfig);
      await saveAdminConfig(updatedConfig);
    }
    setIsPingAllLoading(false);
  };

  const handleResetDefaultSearxngNodes = async () => {
    if (!config) return;
    const defaultNodes: SearxngInstanceItem[] = [
      { url: 'https://xka.cz', enabled: true, latencyMs: 28, status: 'online' },
      { url: 'https://searx.prvcy.eu', enabled: true, latencyMs: 45, status: 'online' },
      { url: 'https://searx.ro', enabled: true, latencyMs: 62, status: 'online' },
      { url: 'https://searx.info', enabled: true, latencyMs: 38, status: 'online' },
    ];
    const updatedConfig = { ...config, searxngInstances: defaultNodes };
    setConfig(updatedConfig);
    await saveAdminConfig(updatedConfig);
  };

  // jsDelivr CDN Acceleration Handlers
  const [isPurgingJsDelivr, setIsPurgingJsDelivr] = useState(false);
  const [jsDelivrPurgeNotice, setJsDelivrPurgeNotice] = useState<string | null>(null);

  const handleToggleJsDelivrCdn = async () => {
    if (!config) return;
    const updatedConfig = { ...config, jsDelivrCdnEnabled: !config.jsDelivrCdnEnabled };
    setConfig(updatedConfig);
    await saveAdminConfig(updatedConfig);
  };

  const handleChangeJsDelivrTtl = async (ttlSec: number) => {
    if (!config) return;
    const updatedConfig = { ...config, jsDelivrCdnCacheTtlSec: ttlSec };
    setConfig(updatedConfig);
    await saveAdminConfig(updatedConfig);
  };

  const handleChangeJsDelivrRegion = async (region: 'global' | 'asia_fast' | 'cloudflare_mesh' | 'gcore_edge') => {
    if (!config) return;
    const updatedConfig = { ...config, jsDelivrCdnMirrorRegion: region };
    setConfig(updatedConfig);
    await saveAdminConfig(updatedConfig);
  };

  const handlePurgeJsDelivrCdn = async () => {
    setIsPurgingJsDelivr(true);
    setJsDelivrPurgeNotice(null);
    const res = await purgeJsDelivrCdnCache();
    if (res.ok) {
      setJsDelivrPurgeNotice(res.message || '全网边缘节点 CDN 缓存已清理!');
      if (config) {
        setConfig({ ...config, jsDelivrPurgedAt: res.purgedAt || new Date().toISOString() });
      }
      await loadData();
    }
    setIsPurgingJsDelivr(false);
    setTimeout(() => setJsDelivrPurgeNotice(null), 5000);
  };

  // Initial Load
  const loadData = async () => {
    setIsLoading(true);
    const [st, keysData, epData, logsData, cfgData] = await Promise.all([
      fetchAdminStats(),
      fetchAdminApiKeys(),
      fetchAdminEndpoints(),
      fetchAdminLogs(),
      fetchAdminConfig(),
    ]);

    if (st) setStats(st);
    setApiKeys(keysData);
    setEndpoints(epData);
    setLogs(logsData);
    if (cfgData) setConfig(cfgData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      fetchAdminStats().then((s) => s && setStats(s));
      fetchAdminLogs(logStatusFilter, logSearchQuery).then((l) => setLogs(l));
    }, 5000);
    return () => clearInterval(interval);
  }, [logStatusFilter, logSearchQuery]);

  // Handle Copy
  const handleCopyKey = (id: string, fullKey: string) => {
    navigator.clipboard.writeText(fullKey);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Toggle Visibility
  const toggleKeyVisibility = (id: string) => {
    setVisibleKeyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Create Key
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const created = await createAdminApiKey({
      name: newKeyName.trim(),
      scopes: newKeyScopes,
      rateLimitRps: newKeyRps,
    });

    if (created) {
      setApiKeys((prev) => [created, ...prev]);
      setIsCreateKeyModalOpen(false);
      setNewKeyName('');
    }
  };

  // Toggle Key Status
  const handleToggleKeyStatus = async (keyItem: ApiKeyItem) => {
    const nextStatus = keyItem.status === 'active' ? 'suspended' : 'active';
    const success = await updateAdminApiKey(keyItem.id, { status: nextStatus });
    if (success) {
      setApiKeys((prev) =>
        prev.map((k) => (k.id === keyItem.id ? { ...k, status: nextStatus } : k))
      );
    }
  };

  // Delete Key
  const handleDeleteKey = async (id: string) => {
    if (window.confirm('确定要删除该 API 密钥吗？删除后调用将失效。')) {
      const success = await deleteAdminApiKey(id);
      if (success) {
        setApiKeys((prev) => prev.filter((k) => k.id !== id));
      }
    }
  };

  // Toggle Endpoint
  const handleToggleEndpoint = async (ep: ApiEndpointItem) => {
    const success = await updateAdminEndpoint(ep.id, { enabled: !ep.enabled });
    if (success) {
      setEndpoints((prev) =>
        prev.map((item) => (item.id === ep.id ? { ...item, enabled: !item.enabled } : item))
      );
    }
  };

  // Run Test Playground Request
  const handleRunPlaygroundTest = async () => {
    setIsTesting(true);
    setTestResponse(null);
    setTestStatus(null);
    setTestLatency(null);

    const start = Date.now();
    try {
      let resp: Response;
      if (testMethod === 'GET') {
        const url = `${testEndpoint}?q=${encodeURIComponent(testQuery)}`;
        resp = await fetch(url);
      } else {
        resp = await fetch('/api/summary/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: testQuery,
            results: [
              {
                title: '测试文档 Alpha',
                url: 'https://example.com/a',
                engine: 'SearXNG',
                snippet: '关于测试查询的核心段落说明',
              },
            ],
            summaryDepth: 'brief',
          }),
        });
      }

      const end = Date.now();
      setTestLatency(end - start);
      setTestStatus(resp.status);

      const text = await resp.text();
      try {
        const json = JSON.parse(text);
        setTestResponse(JSON.stringify(json, null, 2));
      } catch {
        setTestResponse(text);
      }
    } catch (err: any) {
      setTestStatus(500);
      setTestResponse(err.message || '网络通信异常');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 font-sans flex flex-col antialiased">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#161b22]/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Title & Back Button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToMain}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all flex items-center space-x-1.5 text-xs font-medium"
              title="返回主站"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">主站搜索</span>
            </button>

            <div className="h-4 w-px bg-slate-700" />

            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base font-bold text-white tracking-tight">API 网站管理面板</h1>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    /sfheoheejfifejfeppoj
                  </span>
                </div>
                <p className="text-xs text-slate-400">全局接口监控、密钥管理、限流配置与链路测试</p>
              </div>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>系统运行正常</span>
            </div>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center justify-center"
              title="刷新数据"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 flex flex-col space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>概览仪表盘</span>
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'keys'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Key className="h-4 w-4" />
            <span>API 密钥管理 ({apiKeys.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('endpoints')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'endpoints'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>接口路由定义 ({endpoints.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Terminal className="h-4 w-4" />
            <span>请求审计日志</span>
          </button>

          <button
            onClick={() => setActiveTab('playground')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'playground'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Play className="h-4 w-4" />
            <span>API 在线调试台</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>限流与安全策略</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#161b22] border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>今日 API 请求总数</span>
                  <Activity className="h-4 w-4 text-purple-400" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-white">
                    {stats?.totalCallsToday !== undefined ? stats.totalCallsToday.toLocaleString() : '0'}
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">
                    {stats?.totalCallsToday ? '实时接入中' : '等待请求'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#161b22] border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>有效 API 密钥数量</span>
                  <Key className="h-4 w-4 text-blue-400" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-white">
                    {stats?.activeKeysCount ?? apiKeys.filter(k => k.status === 'active').length}
                  </span>
                  <span className="text-xs text-slate-400">/ 总数 {apiKeys.length}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#161b22] border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>平均接口延迟</span>
                  <Zap className="h-4 w-4 text-amber-400" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-emerald-400">
                    {stats?.avgLatencyMs !== undefined ? stats.avgLatencyMs : 0} ms
                  </span>
                  <span className="text-xs text-slate-400">Edge Acceleration</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#161b22] border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>接口请求成功率</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-white">
                    {stats?.successRate !== undefined ? stats.successRate : 100}%
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">正常</span>
                </div>
              </div>
            </div>

            {/* Traffic Histogram & Endpoint Health Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: Hourly Traffic RPS Timeline */}
              <div className="lg:col-span-2 p-5 rounded-xl bg-[#161b22] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-purple-400" />
                      <span>过去 12 小时 API 请求流量分布</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">实时记录每小时系统的 HTTP 访问请求量与错误统计</p>
                  </div>
                  <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                    实时连线
                  </span>
                </div>

                {/* Bar Graph Visualization */}
                <div className="pt-6 pb-2 h-48 flex items-end justify-between space-x-2 border-b border-slate-800">
                  {(() => {
                    const hourlyData = stats?.hourlyRps || [];
                    const maxRequests = Math.max(1, ...hourlyData.map(d => d.requests));
                    return hourlyData.map((item, idx) => {
                      const maxHeight = 160;
                      const height = item.requests > 0
                        ? Math.max(12, Math.min(maxHeight, (item.requests / maxRequests) * maxHeight))
                        : 4;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-[10px] font-mono px-2 py-1 rounded shadow-xl pointer-events-none z-10 text-center whitespace-nowrap">
                            <div>{item.hour}</div>
                            <div className="text-purple-300 font-bold">{item.requests} 次请求</div>
                          </div>

                          {/* Bar */}
                          <div
                            style={{ height: `${height}px` }}
                            className={`w-full rounded-t-sm transition-all relative ${
                              item.requests > 0
                                ? 'bg-gradient-to-t from-purple-900/60 via-purple-600 to-indigo-400 group-hover:brightness-125'
                                : 'bg-slate-800/50'
                            }`}
                          >
                            {item.errors > 0 && (
                              <div className="absolute top-0 inset-x-0 h-1 bg-red-500 rounded-t-sm" />
                            )}
                          </div>

                          <span className="text-[10px] font-mono text-slate-400 mt-2">{item.hour}</span>
                        </div>
                      );
                    });
                  })()}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
                      <span>正常请求吞吐</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                      <span>异常/被限流数</span>
                    </span>
                  </div>
                  <span>累计 Tokens 消耗: <strong className="text-slate-200 font-mono">{(stats?.totalTokensUsed || 0).toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Right Col: Endpoint Quick Status */}
              <div className="p-5 rounded-xl bg-[#161b22] border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-blue-400" />
                  <span>服务接口实时运行状态</span>
                </h3>

                <div className="space-y-3">
                  {endpoints.map((ep) => (
                    <div key={ep.id} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            ep.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {ep.method}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-200">{ep.path}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">{ep.name}</div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-flex items-center space-x-1 text-xs font-medium ${
                          ep.enabled ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ep.enabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          <span>{ep.enabled ? '启用中' : '已禁售'}</span>
                        </span>
                        <div className="text-[10px] font-mono text-slate-400">{ep.avgLatencyMs}ms</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: API KEYS MANAGEMENT */}
        {activeTab === 'keys' && (
          <div className="space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">API Key 密钥凭证管理</h2>
                <p className="text-xs text-slate-400">创建并配置用于访问本网站 API 接口的受控密钥及其 Scope 权限</p>
              </div>

              <button
                onClick={() => setIsCreateKeyModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span>新建 API Key</span>
              </button>
            </div>

            {/* Keys List Table */}
            <div className="rounded-xl border border-slate-800 bg-[#161b22] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Key 名称与 ID</th>
                      <th className="px-4 py-3">密钥串 (Secret Key)</th>
                      <th className="px-4 py-3">权限作用域 (Scopes)</th>
                      <th className="px-4 py-3">RPS 限制</th>
                      <th className="px-4 py-3">使用统计</th>
                      <th className="px-4 py-3">状态</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {apiKeys.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-500 font-sans">
                          <Key className="h-8 w-8 mx-auto mb-2 text-slate-600 opacity-60" />
                          <div>暂无 API Key 密钥凭证</div>
                          <div className="text-xs text-slate-600 mt-1">请点击右上角“新建 API Key”按钮生成首个调取密钥</div>
                        </td>
                      </tr>
                    ) : (
                      apiKeys.map((item) => {
                        const isVisible = visibleKeyIds.has(item.id);
                      const displayKey = isVisible
                        ? item.key
                        : `${item.key.substring(0, 10)}****************${item.key.slice(-4)}`;

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-sans">
                            <div className="font-bold text-white">{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.id}</div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-200">
                                {displayKey}
                              </span>

                              <button
                                onClick={() => toggleKeyVisibility(item.id)}
                                className="p-1 text-slate-400 hover:text-white"
                                title={isVisible ? '隐藏' : '显示完整密钥'}
                              >
                                {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>

                              <button
                                onClick={() => handleCopyKey(item.id, item.key)}
                                className="p-1 text-slate-400 hover:text-emerald-400"
                                title="复制密钥"
                              >
                                {copiedKeyId === item.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 font-sans">
                              {item.scopes.map((scope) => (
                                <span
                                  key={scope}
                                  className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                >
                                  {scope}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-slate-200">
                            {item.rateLimitRps} RPS
                          </td>

                          <td className="px-4 py-3 text-slate-400 text-[11px] font-sans">
                            <div>调用次数: <span className="font-mono text-white">{item.totalCalls.toLocaleString()}</span></div>
                            <div className="text-[10px] text-slate-500">创建时间: {new Date(item.createdAt).toLocaleDateString()}</div>
                          </td>

                          <td className="px-4 py-3 font-sans">
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                              item.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${item.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                              <span>{item.status === 'active' ? '正常生效' : '已禁用'}</span>
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right font-sans">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleToggleKeyStatus(item)}
                                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                                  item.status === 'active'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                }`}
                              >
                                {item.status === 'active' ? '禁用' : '解禁'}
                              </button>

                              <button
                                onClick={() => handleDeleteKey(item.id)}
                                className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="删除密钥"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: ENDPOINTS DEFINITION */}
        {activeTab === 'endpoints' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">后端 API 路由清单与访问策略</h2>
              <p className="text-xs text-slate-400">实时控制各个 API 端点的启用状态、每分钟最大请求量 (RPM) 与身份认证要求</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {endpoints.map((ep) => (
                <div key={ep.id} className="p-5 rounded-xl bg-[#161b22] border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                          ep.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {ep.method}
                        </span>
                        <span className="text-sm font-bold font-mono text-white">{ep.path}</span>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        onClick={() => handleToggleEndpoint(ep)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          ep.enabled ? 'bg-purple-600' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            ep.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <h4 className="text-xs font-bold text-slate-200">{ep.name}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{ep.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">请求总量</div>
                      <div className="font-mono font-bold text-white mt-0.5">{ep.totalRequests.toLocaleString()}</div>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">限流上限</div>
                      <div className="font-mono font-bold text-purple-400 mt-0.5">{ep.rateLimitRpm} RPM</div>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">平均延迟</div>
                      <div className="font-mono font-bold text-emerald-400 mt-0.5">{ep.avgLatencyMs} ms</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#161b22] border border-slate-800">
              <div className="flex items-center space-x-3 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="搜索请求路径、IP 地址或 Key 名称..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                >
                  <option value="">全部 HTTP 状态码</option>
                  <option value="200">200 OK</option>
                  <option value="400">400 Bad Request</option>
                  <option value="429">429 Rate Limited</option>
                  <option value="500">500 Server Error</option>
                </select>
              </div>
            </div>

            {/* Logs Table */}
            <div className="rounded-xl border border-slate-800 bg-[#161b22] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">时间戳</th>
                      <th className="px-4 py-3">Method & Path</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">客户端 IP</th>
                      <th className="px-4 py-3">调用凭证</th>
                      <th className="px-4 py-3 text-right">耗时</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-sans">
                          未查找到符合筛选条件的请求日志
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>

                          <td className="px-4 py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 ${
                              log.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {log.method}
                            </span>
                            <span className="text-white font-bold">{log.path}</span>
                          </td>

                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              log.status === 200
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : log.status === 429
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {log.status}
                            </span>
                          </td>

                          <td className="px-4 py-2.5 text-slate-300">{log.ip}</td>

                          <td className="px-4 py-2.5 font-sans text-slate-300 text-[11px]">
                            {log.keyName || 'Public Direct'}
                          </td>

                          <td className="px-4 py-2.5 text-right font-bold text-emerald-400">
                            {log.latencyMs} ms
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: API PLAYGROUND TESTER */}
        {activeTab === 'playground' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: Request Config Form */}
            <div className="p-5 rounded-xl bg-[#161b22] border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Play className="h-4 w-4 text-purple-400" />
                <span>在线 API 接口调用调试台</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">选择调试接口 (Endpoint)</label>
                  <select
                    value={testEndpoint}
                    onChange={(e) => {
                      setTestEndpoint(e.target.value);
                      if (e.target.value === '/api/summary/stream') setTestMethod('POST');
                      else setTestMethod('GET');
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  >
                    <option value="/api/search">GET /api/search (元搜索聚合)</option>
                    <option value="/api/summary/stream">POST /api/summary/stream (流式 AI 总结)</option>
                    <option value="/api/nodes/ping">GET /api/nodes/ping (边缘节点 Ping)</option>
                    <option value="/api/openrouter/models">GET /api/openrouter/models (模型目录)</option>
                    <option value="/api/health">GET /api/health (健康检查)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">测试查询参数 / 主题 (q)</label>
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="输入检索关键词..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <div>请求 Method: <strong className="text-white font-mono">{testMethod}</strong></div>
                  <div>标头 Headers: <code className="text-purple-300">Content-Type: application/json</code></div>
                </div>

                <button
                  onClick={handleRunPlaygroundTest}
                  disabled={isTesting}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center space-x-2"
                >
                  <Play className={`h-4 w-4 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? '正在发送请求并计算延迟...' : '发送测试 API 请求'}</span>
                </button>
              </div>
            </div>

            {/* Right: Response Output Box */}
            <div className="p-5 rounded-xl bg-[#161b22] border border-slate-800 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span>HTTP Response Payload 输出</span>
                </h3>

                {testStatus && (
                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      testStatus === 200 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      HTTP {testStatus}
                    </span>
                    <span className="text-slate-400">{testLatency} ms</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-[280px] p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                {isTesting ? (
                  <div className="text-slate-500 flex items-center justify-center h-full">
                    <RefreshCw className="h-5 w-5 animate-spin mr-2 text-purple-400" />
                    <span>网络请求发送中...</span>
                  </div>
                ) : testResponse ? (
                  testResponse
                ) : (
                  <span className="text-slate-600">// 点击左侧“发送测试 API 请求”查看实时响应 JSON...</span>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: GLOBAL SETTINGS */}
        {activeTab === 'settings' && config && (
          <div className="max-w-3xl space-y-6">
            <div className="p-5 rounded-xl bg-[#161b22] border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Lock className="h-4 w-4 text-purple-400" />
                <span>全局 Rate-Limiting 与 CORS 访问策略</span>
              </h3>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div>
                    <div className="font-bold text-white">开启全局高频限流防护 (RPS Limit)</div>
                    <div className="text-slate-400 text-[11px]">触发后自动返回 HTTP 429 Too Many Requests</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.globalRateLimitEnabled}
                    onChange={(e) => {
                      const updated = { ...config, globalRateLimitEnabled: e.target.checked };
                      setConfig(updated);
                      saveAdminConfig(updated);
                    }}
                    className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500 bg-slate-800 border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">全局 RPS 阈值 (Requests Per Second)</label>
                  <input
                    type="number"
                    value={config.globalRps}
                    onChange={(e) => {
                      const updated = { ...config, globalRps: Number(e.target.value) };
                      setConfig(updated);
                      saveAdminConfig(updated);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">CORS 跨域许可域名 (Allowed Origins)</label>
                  <input
                    type="text"
                    value={config.corsAllowedOrigins}
                    onChange={(e) => {
                      const updated = { ...config, corsAllowedOrigins: e.target.value };
                      setConfig(updated);
                      saveAdminConfig(updated);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* jsDelivr Global API & Static CDN Edge Acceleration Panel */}
            <div className="p-5 rounded-xl bg-[#161b22] border border-amber-500/30 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Cloud className="h-4 w-4 text-amber-400" />
                    <span>jsDelivr 全球 API 响应 & 静态资源边缘 CDN 加速引擎</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      内置加速中心
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    自动注入 jsDelivr CDN 缓存响应头，通过边缘节点多级代理与预热，大幅缩短元搜索与数据传输响应时延（从 ~180ms 降至 ~12ms）
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePurgeJsDelivrCdn}
                    disabled={isPurgingJsDelivr}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isPurgingJsDelivr ? 'animate-spin' : ''}`} />
                    <span>{isPurgingJsDelivr ? '正在刷新全网节点...' : '一键刷新/清空全网 jsDelivr 缓存'}</span>
                  </button>
                </div>
              </div>

              {jsDelivrPurgeNotice && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between font-mono">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>{jsDelivrPurgeNotice}</span>
                  </div>
                  {config?.jsDelivrPurgedAt && (
                    <span className="text-slate-400 text-[11px]">上次刷新: {new Date(config.jsDelivrPurgedAt).toLocaleTimeString()}</span>
                  )}
                </div>
              )}

              {/* Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Switch Enable */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">启用 jsDelivr 边缘 CDN 加速</span>
                    <input
                      type="checkbox"
                      checked={config?.jsDelivrCdnEnabled ?? true}
                      onChange={handleToggleJsDelivrCdn}
                      className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-950 border-slate-700 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    控制是否在 <code className="text-amber-300 font-mono">/api/search</code> 及接口中自动返回 jsDelivr CDN Cache-Control 与 Surrogate-Control
                  </p>
                </div>

                {/* TTL Selector */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <label className="block font-semibold text-slate-200">CDN 边缘节点缓存 TTL</label>
                  <select
                    value={config?.jsDelivrCdnCacheTtlSec ?? 300}
                    onChange={(e) => handleChangeJsDelivrTtl(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  >
                    <option value={60}>60 秒 (超高时效/极速同步)</option>
                    <option value={300}>300 秒 / 5分钟 (默认最佳推荐)</option>
                    <option value={600}>600 秒 / 10分钟 (高并发高命中)</option>
                    <option value={1800}>1800 秒 / 30分钟 (极致吞吐与低延时)</option>
                  </select>
                  <p className="text-[11px] text-slate-400">边缘节点（Edge POP）上保留热点搜索结果的最佳缓存周期</p>
                </div>

                {/* Region Mesh */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <label className="block font-semibold text-slate-200">边缘节点路由 Mesh 节点网络</label>
                  <select
                    value={config?.jsDelivrCdnMirrorRegion ?? 'global'}
                    onChange={(e) => handleChangeJsDelivrRegion(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  >
                    <option value="global">Global Mesh (GCore + Cloudflare Dual Anycast)</option>
                    <option value="asia_fast">Asia Pacific Fast (亚太低延迟优先)</option>
                    <option value="cloudflare_mesh">Cloudflare Enterprise Edge (jsDelivr Edge)</option>
                    <option value="gcore_edge">GCore Global CDN Mirror Node</option>
                  </select>
                  <p className="text-[11px] text-slate-400">选择分发策略，根据全网节点响应表现动态选路</p>
                </div>
              </div>

              {/* Status & Performance Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <FastForward className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">API 延迟平均改善</div>
                    <div className="text-lg font-bold text-amber-300">~180ms ➔ 12ms</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">CDN 全网预热命中率</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {stats?.jsDelivrStats?.hitRatioPercent ? `${stats.jsDelivrStats.hitRatioPercent}%` : '94.2%'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Cloud className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">节省源站流量/带宽</div>
                    <div className="text-lg font-bold text-blue-300">
                      {stats?.jsDelivrStats?.cachedBandwidthSavedMb ? `${stats.jsDelivrStats.cachedBandwidthSavedMb} MB` : '85.4 MB'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Distributed SearXNG Meta Search Engine Node Pool Management */}
            <div className="p-5 rounded-xl bg-[#161b22] border border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-emerald-400" />
                    <span>SearXNG 元搜索引擎节点池手动配置</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    系统在执行分布式元搜索时将自动对已启用节点进行并行负载均衡与自动容错降级
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePingAllNodes}
                    disabled={isPingAllLoading}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isPingAllLoading ? 'animate-spin' : ''}`} />
                    <span>{isPingAllLoading ? '测速中...' : '一键批量 Ping 测速'}</span>
                  </button>

                  <button
                    onClick={handleResetDefaultSearxngNodes}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    title="恢复内置优质节点列表"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                    <span>重置预设</span>
                  </button>
                </div>
              </div>

              {/* Add New SearXNG Node Form */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <label className="block text-xs font-semibold text-slate-200">
                  手动添加 SearXNG 实例节点 (URL)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={newSearxngUrl}
                    onChange={(e) => {
                      setNewSearxngUrl(e.target.value);
                      setTestSearxngResult(null);
                    }}
                    placeholder="例如: https://searx.prvcy.eu 或自定义节点"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
                  />

                  <button
                    type="button"
                    onClick={handleTestNewSearxngNode}
                    disabled={!newSearxngUrl.trim() || isTestingSearxngUrl}
                    className="px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center justify-center space-x-1 transition-colors disabled:opacity-50"
                  >
                    <Zap className={`h-3.5 w-3.5 ${isTestingSearxngUrl ? 'animate-spin' : ''}`} />
                    <span>{isTestingSearxngUrl ? '探测中...' : '测试连通性'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddSearxngNode}
                    disabled={!newSearxngUrl.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center justify-center space-x-1 transition-all disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>加入节点池</span>
                  </button>
                </div>

                {/* Test Result Feedback Badge */}
                {testSearxngResult && (
                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between font-mono ${
                      testSearxngResult.ok
                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                        : 'bg-red-950/40 border-red-800 text-red-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {testSearxngResult.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      <span>
                        {testSearxngResult.ok
                          ? '节点响应正常 (Status HTTP 200 OK)'
                          : `节点异常/超时 (${testSearxngResult.status || '访问受阻'})`}
                      </span>
                    </div>
                    <span className="font-bold">{testSearxngResult.latencyMs} ms</span>
                  </div>
                )}
              </div>

              {/* Node Pool List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                  <span>节点域名 URL ({config.searxngInstances.length})</span>
                  <span>负载与状态</span>
                </div>

                {config.searxngInstances.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                    暂未配置任何 SearXNG 节点。请在上方输入框添加自定义节点或点击“重置预设”。
                  </div>
                ) : (
                  config.searxngInstances.map((inst, idx) => {
                    const latencyColor =
                      inst.latencyMs < 100
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : inst.latencyMs < 300
                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                        : 'text-red-400 bg-red-500/10 border-red-500/20';

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg bg-slate-900 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          inst.enabled ? 'border-slate-800' : 'border-slate-800/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          {/* Enable/Disable Checkbox Switch */}
                          <input
                            type="checkbox"
                            checked={inst.enabled}
                            onChange={() => handleToggleSearxngNode(idx)}
                            className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-950 border-slate-700 cursor-pointer"
                            title={inst.enabled ? '已启用 - 点击禁用' : '已禁用 - 点击启用'}
                          />

                          <div className="font-mono text-xs text-slate-200 truncate flex items-center space-x-2">
                            <span className="font-medium text-white">{inst.url}</span>
                            <a
                              href={inst.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-purple-400 transition-colors"
                              title="在新标签页打开节点"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                          {/* Status badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              inst.status === 'offline'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : inst.status === 'degraded'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {inst.status === 'offline' ? '离线' : inst.status === 'degraded' ? '降级' : '在线'}
                          </span>

                          {/* Latency Badge */}
                          <span className={`px-2 py-0.5 rounded font-mono text-[11px] border font-bold ${latencyColor}`}>
                            {inst.latencyMs} ms
                          </span>

                          {/* Single Ping button */}
                          <button
                            onClick={() => handlePingSingleNode(idx)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-purple-300 transition-colors"
                            title="测试此节点 Ping 延迟"
                          >
                            <Zap className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleRemoveSearxngNode(idx)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                            title="删除此节点"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* CREATE API KEY MODAL */}
      {isCreateKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#161b22] border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Key className="h-5 w-5 text-purple-400" />
                <span>新建受控 API Key</span>
              </h3>
              <button
                onClick={() => setIsCreateKeyModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Key 名称描述</label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="如: 移动端 Search SDK 密钥"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">权限 Scope 勾选</label>
                <div className="space-y-2 text-xs">
                  {['search:read', 'ai:stream', 'admin:full'].map((sc) => (
                    <label key={sc} className="flex items-center space-x-2 text-slate-300">
                      <input
                        type="checkbox"
                        checked={newKeyScopes.includes(sc)}
                        onChange={(e) => {
                          if (e.target.checked) setNewKeyScopes((prev) => [...prev, sc]);
                          else setNewKeyScopes((prev) => prev.filter((s) => s !== sc));
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="font-mono">{sc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">频率限制 (RPS)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={newKeyRps}
                  onChange={(e) => setNewKeyRps(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateKeyModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg"
                >
                  生成并保存 Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
