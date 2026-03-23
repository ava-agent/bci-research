# BCI SDK 技术选型：MindOctopus 专项

> 目标：为 OpenOctopus 新增 `channel-brainwave` 通道适配器，选出最适合的硬件 + SDK 组合。

## 1. 选型约束（基于 OpenOctopus 架构）

在选型前，先明确 MindOctopus 的技术约束：

```
OpenOctopus 技术栈:
├── Runtime:     Node.js >= 22 + TypeScript 5.7+ (strict)
├── 包管理:      pnpm workspaces monorepo
├── 通道接口:    Channel interface (start/stop/onMessage/send)
├── 网关:        Express 5 + ws (WS RPC port 19789)
├── 消息格式:    IncomingMessage { channelType, chatId, userId, text, metadata }
├── LLM:         Anthropic / OpenAI / Google / Ollama (多 provider)
├── 存储:        SQLite (better-sqlite3) + JSONL sessions
└── 召唤系统:    SOUL.md → Entity → Agent 转化
```

**关键需求：**
1. **必须有 TypeScript/Node.js 绑定** — OpenOctopus 全栈 TypeScript
2. **实时数据流** — 需要持续接收脑电信号，不能是请求-响应模式
3. **蓝牙连接** — macOS 兼容（你的开发环境是 Darwin）
4. **低延迟** — 意图检测需要亚秒级响应
5. **合理价格** — 开发者友好，<$500 最佳
6. **SDK 免费/开源** — 不依赖付费 API 许可

## 2. 消费级 BCI 硬件成熟度评估

### 全景对比

| 设备 | 价格 | 通道数 | 采样率 | 连接 | 电极类型 | 成熟度 | 购买渠道 |
|------|------|--------|--------|------|---------|--------|---------|
| **Muse 2** | ~$250 | 4 EEG + PPG | 256 Hz | BLE | 干电极 | ★★★★★ | Amazon/官网，全球发货 |
| **Muse S** | ~$400 | 4 EEG + PPG | 256 Hz | BLE | 织物电极 | ★★★★★ | Amazon/官网 |
| **OpenBCI Ganglion** | ~$200 | 4 | 200 Hz | BLE | 需自配 | ★★★★ | 官网 |
| **OpenBCI Cyton** | ~$500 | 8 | 250 Hz | Serial/WiFi | 需自配 | ★★★★ | 官网 |
| **Emotiv Insight** | ~$499 | 5 | 128 Hz | BLE | 半干电极 | ★★★★ | 官网 |
| **Emotiv EPOC X** | ~$849 | 14 | 256 Hz | BLE/USB | 湿电极 | ★★★★★ | 官网 |
| **Neurosity Crown** | $1,199 | 8 | 256 Hz | WiFi | 干电极 | ★★★★ | 官网 |
| **BrainBit** | ~$750 | 4 | 250 Hz | BLE | 干电极 | ★★★ | 官网 |
| **NeuroSky MindWave** | ~$100 | 1 | 512 Hz | BLE | 干电极 | ★★★ | Amazon |

### 成熟度详细评分

| 维度 | Muse 2 | OpenBCI Cyton | Emotiv EPOC X | Neurosity Crown | NeuroSky |
|------|--------|--------------|---------------|-----------------|----------|
| 硬件稳定性 | 9/10 | 8/10 | 9/10 | 7/10 | 7/10 |
| 佩戴舒适度 | 9/10 | 4/10 | 6/10 | 8/10 | 8/10 |
| 即开即用 | 9/10 | 3/10 | 7/10 | 8/10 | 9/10 |
| 开发者生态 | 7/10 | 9/10 | 6/10 | 8/10 | 5/10 |
| 社区活跃度 | 8/10 | 8/10 | 6/10 | 6/10 | 4/10 |
| 文档质量 | 6/10 | 7/10 | 7/10 | 8/10 | 5/10 |
| 数据质量 | 7/10 | 9/10 | 8/10 | 7/10 | 3/10 |
| 性价比 | 9/10 | 7/10 | 6/10 | 4/10 | 8/10 |

## 3. SDK 生态深度分析

### 3.1 BrainFlow — 统一 SDK（核心推荐）

```
                    BrainFlow
                   统一 API 层
        ┌────────────┼────────────┐
        │            │            │
    BoardShim   DataFilter   MLModel
    (数据采集)  (信号处理)   (机器学习)
        │
   ┌────┼────┬────┬────┬────┬────┐
   │    │    │    │    │    │    │
 Muse OpenBCI Emotiv Crown BrainBit ...
   2   Cyton  EPOC
```

| 维度 | 详情 |
|------|------|
| **语言绑定** | Python, **TypeScript**, C++, Java, C#, Julia, Matlab, R, Rust（共 9 种）|
| **npm 包** | `brainflow`（可直接 npm install）|
| **支持设备** | 60+ 种板卡/设备，包括 Muse 2/S、OpenBCI 全系、Neurosity Crown、BrainBit |
| **核心 API** | `BoardShim`（采集）、`DataFilter`（滤波/FFT/小波）、`MLModel`（分类/回归）|
| **连接方式** | 自动处理 BLE/Serial/WiFi/USB，开发者无需关心底层协议 |
| **macOS 支持** | 原生 BLE 支持 Muse 2/S（Windows 10.0.19041.0+, macOS 10.15+）|
| **许可** | MIT 开源，完全免费 |
| **版本** | v5.20+，活跃开发中 |
| **文档** | 完善，含每种语言的代码示例 |

**TypeScript API 示例（关键代码）：**
```typescript
import { BoardShim, BrainFlowInputParams, BoardIds, DataFilter } from 'brainflow';

// 初始化 Muse 2
const params = new BrainFlowInputParams();
const boardId = BoardIds.MUSE_2_BOARD;
const board = new BoardShim(boardId, params);

// 开始采集
board.prepareSession();
board.startStream();

// 获取实时数据
const data = board.getCurrentBoardData(256); // 1秒数据
const eegChannels = BoardShim.getEegChannels(boardId);

// 信号处理
for (const ch of eegChannels) {
    DataFilter.performBandpass(data[ch], 256, 1.0, 40.0, 4, 0, 0); // 带通滤波
}

// 频带能量
const bands = DataFilter.getAvgBandPowers(data, eegChannels, 256, true);
// bands[0] = [delta, theta, alpha, beta, gamma] 平均功率

// 停止
board.stopStream();
board.releaseSession();
```

**对 MindOctopus 的意义：** BrainFlow 是唯一同时满足"TypeScript 绑定 + 支持多种消费级设备 + MIT 开源 + 内置信号处理"的 SDK。**它是你的首选核心层。**

### 3.2 Neurosity SDK — 原生 JS/TS SDK

| 维度 | 详情 |
|------|------|
| **语言** | JavaScript/TypeScript（原生）、Python（Beta）|
| **npm 包** | `@neurosity/sdk` |
| **支持设备** | 仅 Neurosity Crown/Notion |
| **独特 API** | `.focus()`、`.calm()`、`.kinesis()`、`.brainwaves()` 语义化 API |
| **连接** | WiFi（设备内置计算，推送处理后的数据）|
| **许可** | MIT 开源 |
| **限制** | 设备 $1,199 + 订阅 $29.99/月，仅自家设备 |

**代码风格：**
```typescript
import { Neurosity } from "@neurosity/sdk";

const neurosity = new Neurosity({ deviceId: "..." });
await neurosity.login({ email, password });

// 极简的语义化 API
neurosity.focus().subscribe(({ probability }) => {
    console.log(`专注度: ${probability}`); // 0.0 ~ 1.0
});

neurosity.calm().subscribe(({ probability }) => {
    console.log(`平静度: ${probability}`);
});

// 原始脑电
neurosity.brainwaves("raw").subscribe((brainwaves) => {
    console.log(brainwaves.data); // [ch1[], ch2[], ...]
});
```

**优势：** API 设计极其优雅，`.focus()` / `.calm()` 直接返回语义化指标。
**劣势：** 绑定单一硬件，价格高，有订阅费。

### 3.3 Muse 官方 SDK / muse-lsl

| 维度 | 详情 |
|------|------|
| **官方 SDK** | 需要申请开发者权限，支持 Windows/macOS/iOS/Android |
| **muse-lsl** | Python 社区包，通过 LSL 协议流式传输 |
| **连接** | 蓝牙（bleak 后端） |
| **限制** | 官方 SDK 需要申请；muse-lsl 仅 Python；社区维护 |

**结论：** 不推荐直接用 Muse 官方 SDK（申请门槛 + 非 TS），通过 BrainFlow 间接支持 Muse 更优。

### 3.4 Emotiv Cortex API

| 维度 | 详情 |
|------|------|
| **协议** | JSON-RPC over WebSocket |
| **语言** | 语言无关（WebSocket）|
| **功能** | 原始 EEG、面部表情、情绪指标、运动命令 |
| **限制** | 消费级设备基础 API 免费；高级 API（原始 EEG/高分辨率指标）需付费许可 |
| **Node.js** | 社区包 `cortex2`（非官方）|

**结论：** WebSocket 协议与 OpenOctopus 网关架构契合，但付费许可和非官方 Node.js 绑定是风险点。

### 3.5 OpenBCI 官方 SDK

| 维度 | 详情 |
|------|------|
| **Python** | `OpenBCI_Python`（官方，已归档） |
| **Node.js** | `OpenBCI_NodeJS_Cyton`（官方，已归档） |
| **现状** | 官方建议使用 BrainFlow 替代原生 SDK |

**结论：** OpenBCI 自己都推荐用 BrainFlow，不需要用原生 SDK。

## 4. SDK 选型矩阵

| 维度 | BrainFlow | Neurosity SDK | Emotiv Cortex | Muse LSL | OpenBCI Native |
|------|-----------|---------------|---------------|----------|----------------|
| **TS/Node 支持** | ✅ npm 包 | ✅ 原生 TS | ⚠️ WebSocket | ❌ Python | ⚠️ 已归档 |
| **多设备支持** | ✅ 60+ | ❌ 仅 Crown | ❌ 仅 Emotiv | ❌ 仅 Muse | ❌ 仅 OpenBCI |
| **免费开源** | ✅ MIT | ✅ MIT | ⚠️ 基础免费 | ✅ | ✅ |
| **内置信号处理** | ✅ DataFilter | ⚠️ 设备端 | ⚠️ 基础 | ❌ 需 MNE | ❌ |
| **内置 ML** | ✅ MLModel | ❌ | ❌ | ❌ | ❌ |
| **实时流** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **macOS BLE** | ✅ | ✅ (WiFi) | ✅ | ⚠️ | ⚠️ |
| **文档质量** | ★★★★ | ★★★★ | ★★★ | ★★ | ★★ |
| **社区活跃度** | ★★★★ | ★★★ | ★★★ | ★★★ | ★★★ |
| **与 OpenOctopus 契合度** | ★★★★★ | ★★★★ | ★★★ | ★★ | ★★ |

## 5. 最终推荐方案

### 首选：BrainFlow (TypeScript) + Muse 2

```
┌───────────────────────────────────────────────────────────────┐
│                   MindOctopus 技术栈                           │
│                                                               │
│  硬件层:  Muse 2 ($250, 4ch EEG + PPG, BLE)                 │
│           ↓ 蓝牙                                              │
│  SDK 层:  BrainFlow TypeScript (npm: brainflow)              │
│           · BoardShim: 数据采集                               │
│           · DataFilter: 滤波/FFT/频带能量                     │
│           · MLModel: 内置分类器                               │
│           ↓                                                   │
│  适配层:  channel-brainwave (新 Channel Adapter)             │
│           · 信号 → 意图转换                                   │
│           · 状态机 (空闲/专注/命令/放松)                       │
│           · 意图 → IncomingMessage                            │
│           ↓                                                   │
│  核心层:  OpenOctopus 现有架构                                │
│           · ChannelManager → Router → AgentRunner → LLM      │
│           · SOUL.md → Summon → 意念召唤 Agent                │
│           · WS RPC (port 19789) 实时推送脑状态               │
└───────────────────────────────────────────────────────────────┘
```

### 为什么选 BrainFlow + Muse 2

**选 BrainFlow 的理由：**

| 理由 | 说明 |
|------|------|
| **唯一满足所有约束** | TypeScript 绑定 + 多设备 + 开源 + 信号处理 + ML |
| **设备无关** | 先用 Muse 2 开发，日后换 OpenBCI/Crown 零代码改动 |
| **OpenOctopus 原生契合** | npm 包，TypeScript strict 兼容 |
| **Synthetic Board** | 开发阶段不需要真实设备，用合成数据调试 |
| **未来扩展** | 从 4 通道 Muse 升级到 8 通道 Cyton 只改一个 boardId |

**选 Muse 2 的理由：**

| 理由 | 说明 |
|------|------|
| **$250，性价比最高** | 同类产品中最便宜的正规 EEG 设备 |
| **全球现货** | Amazon/官网直购，无需等待 |
| **佩戴即用** | 干电极头环，3 秒佩戴，无需涂导电膏 |
| **BLE 直连 macOS** | BrainFlow 原生支持，无需 dongle |
| **4ch EEG + PPG** | 脑电 + 心率，双模态数据 |
| **社区最大** | 大量教程、论文、开源项目 |
| **冥想/健康场景成熟** | 天然适合 MindOctopus 的"智能助理"定位 |

### 备选升级路径

```
入门:    Muse 2 ($250, 4ch)        ← 推荐起步
  ↓
进阶:    OpenBCI Cyton ($500, 8ch)  ← 需要更高精度时
  ↓
专业:    Neurosity Crown ($1199, 8ch) ← 需要语义化 API 时（可同时使用其原生 SDK）
  ↓
研究级:  OpenBCI Cyton+Daisy ($950, 16ch) ← 需要高通道数时
```

**关键：** 由于 BrainFlow 的设备无关性，升级硬件只需改 `BoardIds.MUSE_2_BOARD` → `BoardIds.CYTON_BOARD`，其余代码不变。

## 6. MindOctopus channel-brainwave 实现蓝图

### 6.1 核心架构

```typescript
// packages/channels/src/adapters/brainwave.ts

import { BoardShim, BrainFlowInputParams, BoardIds, DataFilter } from 'brainflow';
import type { Channel, IncomingMessage, MessageHandler } from '../channel.js';

interface BrainwaveConfig {
  boardId: number;          // BoardIds.MUSE_2_BOARD
  serialPort?: string;      // 串口设备（Cyton 用）
  macAddress?: string;      // BLE MAC 地址
  samplingRate: number;     // 256 for Muse 2
  intentThreshold: number;  // 意图触发阈值 (0.0~1.0)
  pollIntervalMs: number;   // 信号轮询间隔 (e.g., 250ms)
}

type BrainState = 'idle' | 'focused' | 'relaxed' | 'command' | 'fatigued';

export class BrainwaveChannel implements Channel {
  readonly type = 'brainwave';
  private board: BoardShim;
  private handler?: MessageHandler;
  private running = false;
  private pollTimer?: NodeJS.Timeout;
  private currentState: BrainState = 'idle';

  constructor(readonly name: string, private config: BrainwaveConfig) {
    const params = new BrainFlowInputParams();
    if (config.serialPort) params.serialPort = config.serialPort;
    if (config.macAddress) params.macAddress = config.macAddress;
    this.board = new BoardShim(config.boardId, params);
  }

  async start(): Promise<void> {
    this.board.prepareSession();
    this.board.startStream();
    this.running = true;
    this.pollTimer = setInterval(() => this.processSignal(), this.config.pollIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.board.stopStream();
    this.board.releaseSession();
    this.running = false;
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async send(chatId: string, message: any): Promise<void> {
    // 反馈通道：可通过 WS 推送到前端可视化，或触发音频/触觉反馈
  }

  isRunning(): boolean {
    return this.running;
  }

  private async processSignal(): Promise<void> {
    const data = this.board.getCurrentBoardData(this.config.samplingRate);
    const eegChannels = BoardShim.getEegChannels(this.config.boardId);

    // 带通滤波 (1-40 Hz)
    for (const ch of eegChannels) {
      DataFilter.performBandpass(data[ch], this.config.samplingRate, 1.0, 40.0, 4, 0, 0);
    }

    // 计算频带能量
    const bands = DataFilter.getAvgBandPowers(data, eegChannels, this.config.samplingRate, true);
    const [delta, theta, alpha, beta, gamma] = bands[0]; // 平均功率

    // 状态判定
    const newState = this.classifyState({ delta, theta, alpha, beta, gamma });

    // 状态变化时触发消息
    if (newState !== this.currentState) {
      const intent = this.stateToIntent(newState, { delta, theta, alpha, beta, gamma });
      this.currentState = newState;

      if (intent && this.handler) {
        const message: IncomingMessage = {
          channelType: 'brainwave',
          channelId: this.name,
          chatId: `brain-${this.name}`,
          userId: 'brain-user',
          text: intent.text,
          metadata: {
            brainState: newState,
            bands: { delta, theta, alpha, beta, gamma },
            confidence: intent.confidence,
          },
        };
        await this.handler(message);
      }
    }
  }

  private classifyState(bands: Record<string, number>): BrainState {
    const { alpha, beta, theta, delta } = bands;
    // 简化的状态分类规则（后续可替换为 ML 模型）
    if (beta / alpha > 2.0) return 'focused';
    if (alpha / beta > 2.0) return 'relaxed';
    if (theta / alpha > 1.5) return 'fatigued';
    if (beta > 0.5 && gamma > 0.3) return 'command';
    return 'idle';
  }

  private stateToIntent(state: BrainState, bands: Record<string, number>) {
    const intents: Record<BrainState, { text: string; confidence: number } | null> = {
      focused:  { text: '[brain:focused] 用户进入高度专注状态', confidence: 0.8 },
      relaxed:  { text: '[brain:relaxed] 用户处于放松状态', confidence: 0.7 },
      fatigued: { text: '[brain:fatigued] 检测到认知疲劳', confidence: 0.6 },
      command:  { text: '[brain:command] 检测到意图命令信号', confidence: 0.5 },
      idle:     null,
    };
    return intents[state];
  }
}
```

### 6.2 配置示例

```json5
// ~/.openoctopus/config.json5
{
  channels: {
    telegram: { type: "telegram", token: "..." },
    brainwave: {
      type: "brainwave",
      boardId: 38,           // BoardIds.MUSE_2_BOARD
      samplingRate: 256,
      intentThreshold: 0.6,
      pollIntervalMs: 250,   // 每 250ms 分析一次
    }
  }
}
```

### 6.3 开发阶段：无需硬件

```json5
// 开发时使用 Synthetic Board（BrainFlow 内置的模拟数据）
{
  channels: {
    brainwave: {
      type: "brainwave",
      boardId: -1,            // BoardIds.SYNTHETIC_BOARD
      samplingRate: 250,
      intentThreshold: 0.6,
      pollIntervalMs: 250,
    }
  }
}
```

## 7. 开发路线图

```
Phase 1 (Week 1-2): 基础设施 ──────────────────────
├── npm install brainflow
├── 用 SYNTHETIC_BOARD 实现 BrainwaveChannel
├── 接入 ChannelManager 工厂
├── WS RPC 暴露实时脑状态 endpoint
└── 验证: 合成数据 → 状态检测 → IncomingMessage → Agent 响应

Phase 2 (Week 3): 真实设备 ─────────────────────────
├── 购买 Muse 2 ($250)
├── 切换 boardId 为 MUSE_2_BOARD
├── 调试 BLE 连接稳定性
├── 校准频带能量阈值
└── 验证: 真实脑电 → 专注/放松检测 → Agent 响应

Phase 3 (Week 4): 智能意图 ─────────────────────────
├── 用 BrainFlow MLModel 替代规则引擎
├── 实现"意念召唤"：特定脑电模式 → Summon 特定 Agent
├── 实现认知状态上下文注入 SOUL.md prompt
├── 添加前端脑波可视化（通过 WS 推送到 dashboard）
└── 验证: 完整的 脑电 → 意图 → Agent → 反馈 闭环

Phase 4 (Week 5+): 增强 ──────────────────────────
├── 运动想象分类（左/右手 → 导航/选择）
├── P300 检测（注意力事件 → 确认操作）
├── 多设备支持验证（切换到 OpenBCI Cyton）
└── SOUL.md 扩展：增加 brainStateRules 配置字段
```

## 8. 参考资源

### BrainFlow
- [官网](https://brainflow.org/)
- [文档](https://brainflow.readthedocs.io/)
- [TypeScript 代码示例](https://brainflow.readthedocs.io/en/stable/Examples.html)
- [npm: brainflow](https://www.npmjs.com/package/brainflow)
- [GitHub](https://github.com/brainflow-dev/brainflow)
- [支持的设备列表](https://brainflow.readthedocs.io/en/stable/SupportedBoards.html)

### Muse 2
- [购买](https://choosemuse.com/pages/shop) / [Amazon](https://www.amazon.com/dp/B0FG8KSDRL)
- [开发者页面](https://choosemuse.com/pages/developers)
- [muse-lsl (Python)](https://github.com/alexandrebarachant/muse-lsl)

### Neurosity Crown（备选）
- [官网](https://neurosity.co/)
- [SDK 文档](https://docs.neurosity.co/)
- [JS SDK (GitHub)](https://github.com/neurosity/neurosity-sdk-js)

### OpenBCI（备选升级）
- [文档](https://docs.openbci.com/)
- [BrainFlow 集成指南](https://docs.openbci.com/ForDevelopers/SoftwareDevelopment/)
