# CerealsNS：无广告、零追踪、AI 驱动的全球聚合搜索引擎

> CerealsNS 是一款开源无广告的全球聚合搜索引擎，结合 **SearXNG 隐私元搜索** 与 **大模型流式推理**，解决广告泛滥、隐私泄露与数据孤岛问题。

---

## 📑 目录

- [1. 痛点与解决方案](#1-痛点与解决方案)
- [2. 核心功能与技术特色](#2-核心功能与技术特色)
- [3. 系统架构与数据流向](#3-系统架构与数据流向)
- [4. 前端交互与快捷键](#4-前端交互与快捷键)
- [5. SEO 与高可用部署](#5-seo-与高可用部署)
- [6. 总结](#6-总结)

---

<a id="1-痛点与解决方案"></a>
## 1. 痛点与解决方案

### 传统搜索四大痛点
1. **商业广告泛滥**：前排充斥竞价排名与 SEO 垃圾站，搜索效率低下。
2. **隐私泄露**：记录 User Profiling 指纹与搜索历史，精准推送定向广告。
3. **引擎单一**：单家搜索引擎覆盖不全，无法一次比对 Google、Bing、Baidu、DuckDuckGo、Yandex 结果。
4. **信息碎片化**：面对数十条网页结果，需逐个点击浏览，缺少智能综合归纳。

### CerealsNS 的解决方案
- **零广告 & 隐私中转**：所有请求由代理层发起，阻断追踪指纹。
- **并发元搜索**：单次查询同时调度全球多源引擎，毫秒级聚合去重。
- **AI 智能总结**：自动提炼要点与引用标注，点击角标直接定位原文。

---

<a id="2-核心功能与技术特色"></a>
## 2. 核心功能与技术特色

### 2.1 全球多源并发引擎
支持勾选并并发请求主流搜索引擎与垂直源：
- **通用网页**：Google、Bing、Baidu、DuckDuckGo、Yandex、Wikipedia、Qwant
- **视频检索**：YouTube、Bilibili、Vimeo、Dailymotion
- **视觉媒体**：Baidu Images、DuckDuckGo Images、Wikimedia、Unsplash、Openverse

### 2.2 SearXNG 节点自适应熔断
后台实时监控多节点健康指标（`instanceHealthMap`）：
- 自动检测并剔除高延迟、超时节点。
- 支持用户添加私有 SearXNG 实例 URL。

### 2.3 AI 流式归纳与追问
接入 OpenRouter / Gemini 大模型 API，实现打字机式流式总结：
- 提炼核心结论与对比观点，生成可引用的内容角标。
- 提供一键深度追问与多轮对话。

---

<a id="3-系统架构与数据流向"></a>
## 3. 系统架构与数据流向

### 技术栈
- **前端**：React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, KaTeX
- **后端**：Express, Node.js (ESBuild 编译为 CommonJS `dist/server.cjs`)
- **边缘服务**：Cloudflare Pages Edge Functions (`/functions/api/*`)
- **AI 大模型**：OpenRouter API / Google Gemini API

### 请求流向示意
```
用户输入查询 ──> 前端参数过滤 ──> 后端 API / Edge Functions
                                       │
      ┌────────────────────────────────┼────────────────────────────────┐
      ▼                                ▼                                ▼
SearXNG 节点网关               Bing / Baidu / DDG 原生抓取        垂直图像/视频数据源 API
      │                                │                                │
      └────────────────────────────────┼────────────────────────────────┘
                                       ▼
                            数据去重、排序与格式标准化
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
              前端卡片渲染输出                 AI 大模型流式总结
```

---

<a id="4-前端交互与快捷键"></a>
## 4. 核心交互与快捷键

- **全快捷键响应**：
  - `Ctrl + K` / `Cmd + K`：唤醒全局命令面板（Command Palette）。
  - `/`：快速聚焦搜索框。
  - `Esc`：关闭弹窗或搜索建议。
- **多样化布局**：支持图文瀑布流、紧凑视图以及 AI 纯享对话模式。

---

<a id="5-seo-与高可用部署"></a>
## 5. SEO 与高可用部署

- **Sitemap**: `/public/sitemap.xml`，覆盖多分类索引。
- **Robots.txt**: `/public/robots.txt`，规范爬虫访问路径。
- **结构化数据**: `index.html` 内置 Schema.org JSON-LD 声明。
- **动态 Document Title**: 依据当前搜索词与分类实时更新，提升搜索引擎抓取效果。

---

<a id="6-总结"></a>
## 6. 总结

CerealsNS 结合开源元搜索生态与现代大模型推理能力，提供了一个**高效、纯净、安全、聪慧**的无广告搜索替代方案。
