# CerealsNS 智能聚合搜索引擎 - 部署与运维指南

`CerealsNS` 是一款基于 AI 大模型与 SearXNG 隐私元搜索技术的无广告全球聚合搜索引擎。系统结合了 Express 后端 API 代理、并发 SearXNG 节点调度、大模型流式总结（OpenRouter / Gemini）以及前端 React 18 / Vite 极致响应界面。

---

## 目录

1. [项目架构与部署模式](#1-项目架构与部署模式)
2. [环境准备](#2-环境准备)
3. [本地开发与调试](#3-本地开发与调试)
4. [生产环境构建与部署](#4-生产环境构建与部署)
   - [模式一：Node.js 独立服务器 / PM2 部署](#模式一nodejs-独立服务器--pm2-部署)
   - [模式二：Docker 容器化 / Cloud Run 部署](#模式二docker-容器化--cloud-run-部署)
   - [模式三：Cloudflare Pages / Edge Functions 部署](#模式三cloudflare-pages--edge-functions-部署)
5. [环境变量配置 (.env)](#5-环境变量配置-env)
6. [SEO 与 SITEMAP 配置](#6-seo-与-sitemap-配置)
7. [常见问题与运维排查](#7-常见问题与运维排查)

---

## 1. 项目架构与部署模式

项目支持两种运行与部署形态：

- **Full-Stack Node.js Mode (全栈模式)**：由 `server.ts` 提供 Express API 代理与 Vite 静态资源托管，原生支持多线程并发 Fetch、Bing/Baidu/DDG/SearXNG 节点抓取、OpenRouter 流式 AI 总结等。
- **Cloudflare Pages Edge Mode (边缘计算模式)**：包含 `/functions/api/search.js` 等边缘 API 路由，可无缝部署至 Cloudflare Pages Functions。

---

## 2. 环境准备

确保部署服务器安装了以下基础依赖：

- **Node.js**: `v18.0.0` 或更高版本 (推荐 `v20.x LTS`)
- **npm**: `v9.0.0` 或更高版本
- **Git**

---

## 3. 本地开发与调试

```bash
# 1. 克隆代码仓库
git clone https://github.com/your-username/cerealsns-search.git
cd cerealsns-search

# 2. 安装项目依赖
npm install

# 3. 配置环境变量 (可选)
cp .env.example .env

# 4. 启动本地开发服务器 (端口 3000)
npm run dev
```

启动后在浏览器访问：`http://localhost:3000`

---

## 4. 生产环境构建与部署

### 模式一：Node.js 独立服务器 / PM2 部署

适用于 Linux VPS、宝塔面板、AWS EC2、阿里云 / 腾讯云 CVM 等。

#### 1. 编译构建

执行单步构建指令（会自动使用 `vite build` 编译前端，并使用 `esbuild` 将 `server.ts` 打包为 `dist/server.cjs`）：

```bash
npm run build
```

#### 2. 使用 PM2 守护进程运行

```bash
# 安装全局 PM2
npm install -g pm2

# 启动服务
NODE_ENV=production PORT=3000 pm2 start dist/server.cjs --name "cerealsns-search"

# 保存 PM2 进程状态并设置开机自启
pm2 save
pm2 startup
```

---

## 5. 环境变量配置 (.env)

在项目根目录下创建 `.env` 文件以配置可选的后端与 AI 功能：

```env
# 服务器监听端口 (默认 3000)
PORT=3000

# OpenRouter 大模型 API Key (用于 AI 流式总结功能)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Google Gemini API Key (备用 AI 总结模型)
GEMINI_API_KEY=your_gemini_api_key_here

# 自定义 SearXNG 实例节点 (以逗号分隔)
CUSTOM_SEARXNG_URLS=https://searx.be,https://searxng.site,https://searx.space
```

---

## 6. SEO 与 SITEMAP 配置

项目已内置完整的 SEO 设施：

- **Sitemap**: `/public/sitemap.xml` 或访问 `https://ns.cereals.cam/sitemap.xml`
- **Robots.txt**: `/public/robots.txt`
- **JSON-LD**: `index.html` 中已配置 Schema.org WebSite 与 WebApplication 结构化标记
- **动态 Title**: 页面根据当前搜索关键字自动更新 `document.title`

发布新站点后，可直接在 **Google Search Console** 或 **Baidu Webmaster** 中提交 Sitemap：
`https://ns.cereals.cam/sitemap.xml`

---

## 7. 常见问题与运维排查

1. **某些 SearXNG 节点无法访问或超时？**
   - 系统内置了自适应健康探测与熔断机制（`instanceHealthMap`），连续失败的节点会被自动降级，优先调度最快的节点。
   - 可在 UI 的设置弹窗中自行增加或更换高可靠的 SearXNG 节点。

2. **如何修改默认搜索引擎或引擎搭配？**
   - 前端支持在搜索框下方自由选择组合（Google、Bing、Baidu、DuckDuckGo、Yandex、Wikipedia、Unsplash 等），所选项会透传至后端 API 实施精准过滤。
