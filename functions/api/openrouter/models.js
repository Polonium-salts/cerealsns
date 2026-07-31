export async function onRequestGet() {
  const models = [
    {
      id: 'openrouter/free',
      name: 'OpenRouter Free Router (自动选免费)',
      provider: 'OpenRouter',
      contextLength: 200000,
      pricing: { prompt: '$0.00/M', completion: '$0.00/M' },
      latencyAvgMs: 220,
      description: 'OpenRouter 官方免费智能路由，自动路由至当前最稳定、最高速的免费大模型。',
      recommendedFor: '默认智能总结、快讯提炼与综合分析 (推荐)'
    },
    {
      id: 'google/gemma-4-31b-it:free',
      name: 'Google Gemma 4 31B (Free)',
      provider: 'Google',
      contextLength: 262144,
      pricing: { prompt: '$0.00/M', completion: '$0.00/M' },
      latencyAvgMs: 280,
      description: 'Google 256K 超长上下文密集多模态开源模型，完全免费。',
      recommendedFor: '长文本长文章总结与多领域分析'
    },
    {
      id: 'nvidia/nemotron-3-super-120b-a12b:free',
      name: 'NVIDIA Nemotron 3 Super (Free)',
      provider: 'NVIDIA',
      contextLength: 262144,
      pricing: { prompt: '$0.00/M', completion: '$0.00/M' },
      latencyAvgMs: 350,
      description: 'NVIDIA 120B MoE 旗舰大模型，256K 上下文支持复杂逻辑与推导，完全免费。',
      recommendedFor: '学术研究、复杂技术难题与对比拆解'
    },
    {
      id: 'openai/gpt-oss-20b:free',
      name: 'OpenAI gpt-oss-20b (Free)',
      provider: 'OpenAI',
      contextLength: 131072,
      pricing: { prompt: '$0.00/M', completion: '$0.00/M' },
      latencyAvgMs: 320,
      description: 'OpenAI 20B 开源权重 MoE 模型，具备思考推导能力，完全免费。',
      recommendedFor: '日常信息快速提炼与通用思考问答'
    },
    {
      id: 'cohere/north-mini-code:free',
      name: 'Cohere North Mini Code (Free)',
      provider: 'Cohere',
      contextLength: 128000,
      pricing: { prompt: '$0.00/M', completion: '$0.00/M' },
      latencyAvgMs: 260,
      description: 'Cohere 专精代码与文档结构化处理模型，完全免费。',
      recommendedFor: '技术文档、代码解析与结构化数据提取'
    }
  ];

  return new Response(JSON.stringify(models), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
