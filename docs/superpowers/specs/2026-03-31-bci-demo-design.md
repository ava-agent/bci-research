# BCI Agent Demo 设计文档

> 在线交互式脑机接口 AI Agent 演示，面向产品/投资人，零安装打开即用。

## 目标

- **受众**: 产品经理/投资人（非技术人员）
- **核心体验**: 左侧实时脑波可视化 + 右侧 AI Agent 对话，完整展示 BCI→AI 链路
- **交互方式**: 自动运行 + 用户可手动切换状态、与 AI 对话

## 架构

```
┌──────────────────────────┐                      ┌────────────────────────┐
│   Vercel (Next.js)        │     HTTP POST        │  Cloudbase 云函数       │
│                           │════════════════════► │  (Python)              │
│  ├── JS 合成脑波生成器     │  /api/agent          │                        │
│  ├── 前端信号处理          │  {state, bands,      │  ├── classify_state()  │
│  │   └── 频带提取 (FFT)   │   message}           │  ├── decode_intent()   │
│  ├── 状态解码 (前端)       │                      │  ├── GLM-4-Flash 调用   │
│  ├── 实时脑波图 (ECharts)  │ ◄════════════════════│  └── 返回 Agent 回复    │
│  ├── 频带柱状图            │  {response, tools}   │                        │
│  ├── AI 对话面板           │                      └────────────────────────┘
│  └── 状态切换按钮          │
└──────────────────────────┘
```

### 前端 (Next.js on Vercel)

**技术栈**: Next.js 14 App Router, ECharts, TailwindCSS

**视觉风格**: 简洁现代风 — 浅色背景 `#f8f9fc`，白色圆角卡片，紫色调 `#6366f1`

**布局**: 经典仪表盘 — 顶部导航栏，左侧 60% 信号区，右侧 40% AI 对话

**左侧信号区**:
- 状态卡片行: 当前状态 badge、置信度百分比、采样率
- 实时脑波折线图 (ECharts，滚动 10 秒窗口)
- 频带柱状图 (δ θ α β γ 五柱，实时更新)

**右侧 AI 对话**:
- 消息列表：系统消息（状态变化）+ Agent 回复
- 底部输入框：用户可手动发消息给 Agent

**交互功能**:
- 状态切换按钮组 (focused / relaxed / fatigued / command) — 手动切换模拟脑状态
- 连接状态指示器

**前端信号处理**:
- JS 合成脑波生成器：模拟多通道 EEG（叠加 δθαβγ 正弦波 + 噪声）
- FFT 频带提取：用 Web Audio API 或简单 DFT 提取五个频带的能量
- 状态解码：移植 decoder.py 的频率比率规则到 TypeScript

### 后端 (Cloudbase 云函数)

**语言**: Python

**接口**: 单个 HTTP 云函数

- **请求**:
  ```json
  {
    "state": "focused",
    "confidence": 0.87,
    "bands": {"delta":0.04, "theta":0.04, "alpha":0.08, "beta":0.55, "gamma":0.30},
    "message": "可选的用户消息"
  }
  ```

- **响应**:
  ```json
  {
    "response": "当前您正处于高度专注状态...",
    "tools_called": ["suggest_activity"]
  }
  ```

**逻辑**: 复用现有 agent.py 的 LangGraph 图，接收前端已解码的脑状态，调用 GLM-4-Flash 生成回复。

### 数据流

1. 前端 JS 每 100ms 生成合成 EEG 数据点 → 波形图实时滚动
2. 每 1 秒做一次 FFT → 更新频带柱状图 + 状态解码
3. 脑状态变化时 → POST 到 Cloudbase 云函数 → Agent 回复显示在对话面板
4. 用户手动切换状态按钮 → 同样触发 Agent 调用
5. 用户输入消息 → 附带当前脑状态一起 POST → Agent 回复

## 不做的事

- 不做用户认证（公开 demo）
- 不做数据持久化（无数据库）
- 不做移动端适配（桌面端为主）
- 不做多语言（仅中文）

## 部署

- 前端: Vercel（自动部署，绑域名）
- 后端: Cloudbase 云函数（Python runtime）
- 环境变量: `OPENAI_API_KEY`（智谱 API Key）配置在 Cloudbase 云函数中
