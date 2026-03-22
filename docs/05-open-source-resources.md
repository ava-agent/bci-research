# BCI 开源项目与开发资源

## 1. 核心软件框架

### 1.1 Python 生态（推荐起步）

| 框架 | 描述 | Stars | 语言 |
|------|------|-------|------|
| **[MNE-Python](https://github.com/mne-tools/mne-python)** | 神经影像数据（EEG/MEG/sEEG/ECoG/fNIRS）处理、分析和可视化的标准库 | 2.5k+ | Python |
| **[BrainFlow](https://github.com/brainflow-dev/brainflow)** | 统一 API 桥接各种 EEG 设备（OpenBCI/Muse/Emotiv 等），无需自写驱动 | 2k+ | C++/Python |
| **[Braindecode](https://github.com/braindecode/braindecode)** | 基于 PyTorch 的深度学习 BCI 工具包（EEGNet, ShallowConvNet 等） | 800+ | Python |
| **[pyRiemann](https://github.com/pyRiemann/pyRiemann)** | 黎曼几何方法处理 EEG，BCI 竞赛中表现优异 | 600+ | Python |
| **[MOABB](https://github.com/NeuroTechX/moabb)** | BCI 算法可信基准测试平台，标准化离线算法比较 | 500+ | Python |
| **[MetaBCI](https://github.com/TBC-TJU/MetaBCI)** | 一站式 BCI 开源平台：刺激呈现 + 数据处理 + 在线信息流 | 400+ | Python |

### 1.2 实验设计与数据采集

| 工具 | 描述 | 语言 |
|------|------|------|
| **[PsychoPy](https://github.com/psychopy/psychopy)** | 神经科学/心理学实验设计（刺激呈现、范式设计） | Python |
| **[OpenViBE](http://openvibe.inria.fr/)** | BCI 设计和测试平台，可视化编程 | C++ |
| **[BCI2000](https://www.bci2000.org/)** | 经典 BCI 软件套件，包含完整工作流 | C++ |
| **[EEG-ExPy](https://github.com/NeuroTechX/EEG-ExPy)** | FOSS Python 库，EEG 实验设计、记录和分析 | Python |
| **[Timeflux](https://github.com/timeflux/timeflux)** | 实时生物信号处理框架 | Python |

### 1.3 MATLAB 工具箱

| 工具 | 描述 |
|------|------|
| **[EEGLAB](https://sccn.ucsd.edu/eeglab/)** | 最广泛使用的 EEG 分析 MATLAB 工具箱 |
| **[FieldTrip](https://www.fieldtriptoolbox.org/)** | MEG/EEG 高级分析工具箱 |
| **[BBCI Toolbox](https://github.com/bbci/bbci_public)** | Berlin BCI 工具箱 |
| **[BCILab](https://sccn.ucsd.edu/wiki/BCILAB)** | EEGLAB 扩展，专注 BCI 设计 |

### 1.4 其他语言工具

| 工具 | 描述 | 语言 |
|------|------|------|
| **[BrainBay](https://github.com/ChrisVeigl/BrainBay)** | 生物/神经反馈应用 | C++ |
| **[Brainstorm](https://neuroimage.usc.edu/brainstorm/)** | MEG/EEG/fNIRS 分析（MATLAB 界面） | MATLAB/Java |
| **[EEGsynth](https://github.com/eegsynth/eegsynth)** | 将 EEG 信号转化为音乐/艺术控制信号 | Python |

## 2. 硬件开源平台

### 2.1 OpenBCI 系列

| 板卡 | 通道数 | 价格 | 适用 |
|------|--------|------|------|
| **Ganglion** | 4 通道 | ~$200 | 入门/教学 |
| **Cyton** | 8 通道 | ~$500 | 研究原型 |
| **Cyton + Daisy** | 16 通道 | ~$950 | 研究级 |
| **Galea** | 多模态 | - | EEG+EMG+EDA+PPG |

- GitHub: [github.com/openbci](https://github.com/openbci)
- 配套软件：OpenBCI GUI、OpenBCI_MNE

### 2.2 其他开源/低成本硬件

- **OpenEEG**: DIY EEG 项目
- **HackEEG**: Arduino 兼容的高性能 ADS1299 EEG 接口
- **Muse**: 虽非开源，但有丰富的第三方工具支持（MindMonitor, muse-lsl）

## 3. 数据集

### 3.1 BCI 竞赛数据集

| 数据集 | 范式 | 描述 |
|--------|------|------|
| BCI Competition II (2003) | MI, P300, SCP | 经典基准数据集 |
| BCI Competition III (2005) | MI, P300, ECoG | 含侵入式数据 |
| BCI Competition IV (2008) | MI, ECoG | 广泛使用的运动想象数据 |

### 3.2 公开数据集

| 数据集 | 来源 | 内容 |
|--------|------|------|
| **[PhysioNet EEG MI](https://physionet.org/content/eegmmidb/)** | PhysioNet | 109 名被试运动/想象执行 EEG |
| **[OpenNeuro](https://openneuro.org/)** | Stanford | 大量神经影像公开数据集 |
| **[BNCI Horizon](http://bnci-horizon-2020.eu/)** | EU 项目 | BCI 研究数据集合 |
| **[MOABB Datasets](https://moabb.neurotechx.com/)** | NeuroTechX | 集成 30+ BCI 数据集统一接口 |
| **[MindBigData](http://mindbigdata.com/)** | 个人项目 | MNIST/ImageNet 视觉刺激 EEG |
| **SCCN Collection** | UCSD | EEG/ERP 公开数据集合 |
| **RAM (DARPA)** | UPenn | 侵入式记录数据 |
| **National Sleep Research Resource** | NIH | 睡眠 EEG 数据 |

## 4. 学习资源

### 4.1 在线课程

- **[Neuromatch Academy](https://neuromatch.io/)** — 计算神经科学暑期学校（免费）
- **Columbia University BCI Course** — BCI 原理与应用
- **UC Berkeley Neurotechnology Course** — 神经技术课程
- **Coursera: Computational Neuroscience** — 计算神经科学基础

### 4.2 书籍

| 书名 | 作者 | 主题 |
|------|------|------|
| *Brain-Computer Interfaces: Principles and Practice* | Wolpaw & Wolpaw | BCI 圣经，全面参考 |
| *Deep Learning for EEG-based BCI* | Xiang Zhang et al. | 深度学习 + BCI |
| *Analyzing Neural Time Series Data* | Mike X Cohen | EEG 信号分析（理论+实践）|
| *Principles of Neural Science* | Kandel et al. | 神经科学基础 |
| *Beyond Boundaries* | Miguel Nicolelis | BCI 科普 |

### 4.3 在线学习工具

- **[EEGEdu](https://eegedu.com/)** — 基于 Web 的 EEG 交互式学习平台
- **[NeuroTechX Tutorials](https://github.com/NeuroTechX)** — 社区教程和工作坊
- **[Chip Audette's EEG Hacker](http://eeghacker.blogspot.com/)** — DIY EEG 博客

## 5. 社区

| 社区 | 平台 | 描述 |
|------|------|------|
| **[NeuroTechX](https://neurotechx.com/)** | 全球 | 最大的神经技术社区 |
| **[OpenBCI Forum](https://openbci.com/forum/)** | 论坛 | OpenBCI 用户社区 |
| **r/neurotechnology** | Reddit | 神经技术讨论 |
| **r/BCI** | Reddit | BCI 专题讨论 |
| **NeuroBB** | 论坛 | 独立 BCI/神经科学论坛 |
| **NeuroTechX Medium** | 博客 | 社区技术文章 |

## 6. 竞赛与挑战

| 竞赛 | 描述 |
|------|------|
| **BCI Competition** | 经典 BCI 算法竞赛（不定期） |
| **Kaggle BCI 挑战** | 抓取和提升、错误检测、癫痫预测等 |
| **BR41N.io** | g.tec 组织的 BCI hackathon |
| **Cybathlon** | 辅助技术国际竞赛（含 BCI 赛道） |
| **Brain Drone Race** | 脑控无人机竞速 |

## 7. 快速入门路径

```
第1周：学习基础
  ├── 阅读 BCI 基础概念
  ├── 安装 MNE-Python + BrainFlow
  └── 用 PhysioNet 数据集跑通第一个分析流程

第2周：信号处理
  ├── 学习 EEG 预处理（滤波、伪迹去除）
  ├── 实践 CSP + LDA 运动想象分类
  └── 用 MOABB 对比不同算法

第3周：深度学习
  ├── 安装 Braindecode
  ├── 训练 EEGNet 模型
  └── 探索迁移学习方法

第4周：在线实验（可选）
  ├── 购买 OpenBCI 或 Muse 设备
  ├── 用 BrainFlow 采集实时数据
  └── 构建简单的实时 BCI Demo
```
