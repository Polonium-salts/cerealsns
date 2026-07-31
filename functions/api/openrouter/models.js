export async function onRequestGet() {
  const models = [
    {
      id: 'google/gemini-2.0-flash-001',
      name: 'Gemini 2.0 Flash',
      provider: 'Google',
      contextLength: 1048576,
      pricing: { prompt: '$0.10/M', completion: '$0.40/M' },
      latencyAvgMs: 320,
      description: '极速、精准的AI大模型，支持高并发超长上下文总结与事实核查。',
      recommendedFor: '默认智能总结、快讯提炼与综合分析'
    },
    {
      id: 'deepseek/deepseek-r1',
      name: 'DeepSeek R1',
      provider: 'DeepSeek',
      contextLength: 65536,
      pricing: { prompt: '$0.55/M', completion: '$2.19/M' },
      latencyAvgMs: 580,
      description: '擅长深度逻辑推理、数学证明与代码技术全景复盘。',
      recommendedFor: '学术研究、复杂技术难题与对比拆解'
    },
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic',
      contextLength: 200000,
      pricing: { prompt: '$3.00/M', completion: '$15.00/M' },
      latencyAvgMs: 450,
      description: '卓越的文采、行业分析报告与高可读性结构化输出。',
      recommendedFor: '商业策划、深度新闻溯源与专业撰稿'
    },
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'OpenAI',
      contextLength: 128000,
      pricing: { prompt: '$0.15/M', completion: '$0.60/M' },
      latencyAvgMs: 390,
      description: '高性价比、高稳定性通用知识总结助手。',
      recommendedFor: '日常信息快速提炼与基础问答'
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B',
      provider: 'Meta',
      contextLength: 128000,
      pricing: { prompt: '$0.12/M', completion: '$0.30/M' },
      latencyAvgMs: 410,
      description: '开源顶级能力，适合快速概念释义与技术检索。',
      recommendedFor: '开发者工具与开源技术文档查阅'
    }
  ];

  return new Response(JSON.stringify(models), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
