# BCI Agent MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working BCI AI Agent that captures simulated EEG signals, decodes brain states into intentions, and passes them to a LangGraph agent that responds intelligently in Chinese.

**Architecture:** BrainFlow synthetic board generates EEG data → signal processing extracts frequency band powers → rule-based classifier determines brain state (focused/relaxed/fatigued/command/idle) → on state change, LangGraph agent receives the decoded intent, reasons via Volcengine Ark through an OpenAI-compatible LangChain client, optionally calls tools, and returns a response. The main loop polls every second and prints real-time brain state + agent responses to the terminal.

**Tech Stack:** Python 3.11+, BrainFlow (signal capture + processing), LangGraph (agent orchestration), langchain-openai (Ark-compatible LLM), numpy

---

## File Structure

```
app/
├── pyproject.toml              # Project metadata + dependencies
├── .env.example                # API key template
├── src/
│   └── bci_agent/
│       ├── __init__.py         # Package init
│       ├── main.py             # Entry point: capture → decode → agent loop
│       ├── signal.py           # BrainFlow signal capture + band power extraction
│       ├── decoder.py          # Brain state classification + intent text mapping
│       ├── agent.py            # LangGraph graph definition (nodes + edges)
│       └── tools.py            # Agent tools (time, notes, activity suggestions)
└── tests/
    ├── __init__.py
    ├── test_signal.py          # Tests for signal processing
    ├── test_decoder.py         # Tests for brain state classification
    └── test_agent.py           # Tests for LangGraph graph structure + nodes
```

**Design decisions:**
- One file per concern — signal, decoder, agent, tools are independent modules
- `main.py` is the only file that imports all others (composition root)
- Signal processing is separate from classification — different change reasons
- Tools are separate from graph — easy to add/remove tools without touching agent logic

---

## Chunk 1: Project Setup + Signal Processing

### Task 1: Project Scaffold

**Files:**
- Create: `app/pyproject.toml`
- Create: `app/.env.example`
- Create: `app/src/bci_agent/__init__.py`
- Create: `app/tests/__init__.py`

- [ ] **Step 1: Create project directory structure**

```bash
cd /Users/kevinten/projects/bci-research
mkdir -p app/src/bci_agent app/tests
```

- [ ] **Step 2: Create pyproject.toml**

```toml
[project]
name = "bci-agent"
version = "0.1.0"
description = "BCI AI Agent MVP - 脑机接口意念传输AI智能体"
requires-python = ">=3.11"
dependencies = [
    "brainflow>=5.12.0",
    "langgraph>=0.2.0",
    "langchain-openai>=0.3.0",
    "langchain-core>=0.3.0",
    "numpy>=1.24.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
]

[project.scripts]
bci-agent = "bci_agent.main:main"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]
```

- [ ] **Step 3: Create .env.example**

```
ARK_API_KEY=your_ark_api_key_here
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/coding/v3
ARK_CHAT_MODEL=doubao-seed-2-0-code-preview-260215
```

- [ ] **Step 4: Create __init__.py files**

`app/src/bci_agent/__init__.py`:
```python
"""BCI Agent MVP - 脑机接口意念传输AI智能体"""
```

`app/tests/__init__.py`: empty file

- [ ] **Step 5: Install dependencies**

```bash
cd app
pip install -e ".[dev]"
```

Expected: successful installation, no errors.

- [ ] **Step 6: Commit**

```bash
git add app/pyproject.toml app/.env.example app/src/bci_agent/__init__.py app/tests/__init__.py
git commit -m "feat: scaffold BCI Agent MVP project structure"
```

---

### Task 2: Signal Processing Module

**Files:**
- Create: `app/tests/test_signal.py`
- Create: `app/src/bci_agent/signal.py`

- [ ] **Step 1: Write failing tests for band power extraction**

```python
# app/tests/test_signal.py
import numpy as np
from bci_agent.signal import extract_band_powers


def test_extract_band_powers_returns_five_bands():
    """Band powers should contain delta, theta, alpha, beta, gamma."""
    # Create simple synthetic EEG: 4 channels, 256 samples
    rng = np.random.default_rng(42)
    eeg = rng.standard_normal((4, 256))
    bands = extract_band_powers(eeg, sampling_rate=256)

    assert set(bands.keys()) == {"delta", "theta", "alpha", "beta", "gamma"}


def test_extract_band_powers_values_are_positive():
    """All band power values should be non-negative."""
    rng = np.random.default_rng(42)
    eeg = rng.standard_normal((4, 256))
    bands = extract_band_powers(eeg, sampling_rate=256)

    for name, value in bands.items():
        assert value >= 0, f"{name} band power should be >= 0, got {value}"


def test_extract_band_powers_alpha_dominant_for_10hz_signal():
    """A 10Hz sine wave should produce dominant alpha (8-13Hz) power."""
    t = np.linspace(0, 1, 256, endpoint=False)
    sine_10hz = np.sin(2 * np.pi * 10 * t)
    eeg = np.stack([sine_10hz] * 4)  # 4 identical channels

    bands = extract_band_powers(eeg, sampling_rate=256)

    assert bands["alpha"] > bands["delta"], "Alpha should dominate over delta for 10Hz signal"
    assert bands["alpha"] > bands["theta"], "Alpha should dominate over theta for 10Hz signal"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd app && python -m pytest tests/test_signal.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'bci_agent.signal'`

- [ ] **Step 3: Implement signal.py**

```python
# app/src/bci_agent/signal.py
"""BrainFlow signal capture and band power extraction."""
import numpy as np
from brainflow.board_shim import BoardShim, BrainFlowInputParams, BoardIds
from brainflow.data_filter import DataFilter, FilterTypes


class SignalSource:
    """Captures EEG signals from BrainFlow-compatible devices."""

    def __init__(
        self,
        board_id: int = BoardIds.SYNTHETIC_BOARD,
        params: dict | None = None,
    ):
        self.board_id = board_id
        self.sampling_rate = BoardShim.get_sampling_rate(board_id)
        self.eeg_channels = BoardShim.get_eeg_channels(board_id)

        input_params = BrainFlowInputParams()
        if params:
            for k, v in params.items():
                setattr(input_params, k, v)

        self.board = BoardShim(board_id, input_params)

    def start(self):
        self.board.prepare_session()
        self.board.start_stream()

    def stop(self):
        self.board.stop_stream()
        self.board.release_session()

    def read(self, duration_s: float = 1.0) -> np.ndarray:
        """Read EEG data. Returns shape (num_eeg_channels, samples)."""
        num_samples = int(self.sampling_rate * duration_s)
        data = self.board.get_current_board_data(num_samples)
        return data[self.eeg_channels]


def extract_band_powers(
    eeg_data: np.ndarray,
    sampling_rate: int,
) -> dict[str, float]:
    """Extract average band powers from multi-channel EEG data.

    Args:
        eeg_data: shape (num_channels, num_samples)
        sampling_rate: sampling rate in Hz

    Returns:
        dict with keys: delta, theta, alpha, beta, gamma
    """
    data = eeg_data.copy()
    num_channels = data.shape[0]

    for ch in range(num_channels):
        DataFilter.perform_bandpass(
            data[ch], sampling_rate, 1.0, 40.0, 4, FilterTypes.BUTTERWORTH, 0
        )

    channels = list(range(num_channels))
    bands = DataFilter.get_avg_band_powers(data, channels, sampling_rate, True)

    band_names = ["delta", "theta", "alpha", "beta", "gamma"]
    return dict(zip(band_names, bands[0]))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd app && python -m pytest tests/test_signal.py -v
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/bci_agent/signal.py app/tests/test_signal.py
git commit -m "feat: add signal processing module with band power extraction"
```

---

### Task 3: Brain State Decoder

**Files:**
- Create: `app/tests/test_decoder.py`
- Create: `app/src/bci_agent/decoder.py`

- [ ] **Step 1: Write failing tests for state classification**

```python
# app/tests/test_decoder.py
from bci_agent.decoder import classify_state, decode_intent, BrainIntent


def test_classify_focused_when_beta_dominates():
    """High beta/alpha ratio → focused state."""
    bands = {"delta": 0.1, "theta": 0.1, "alpha": 0.2, "beta": 0.6, "gamma": 0.1}
    state, confidence = classify_state(bands)
    assert state == "focused"
    assert 0.0 < confidence <= 1.0


def test_classify_relaxed_when_alpha_dominates():
    """High alpha/beta ratio → relaxed state."""
    bands = {"delta": 0.1, "theta": 0.1, "alpha": 0.6, "beta": 0.2, "gamma": 0.1}
    state, confidence = classify_state(bands)
    assert state == "relaxed"
    assert 0.0 < confidence <= 1.0


def test_classify_fatigued_when_theta_dominates():
    """High theta/alpha ratio → fatigued state."""
    bands = {"delta": 0.1, "theta": 0.6, "alpha": 0.2, "beta": 0.1, "gamma": 0.1}
    state, confidence = classify_state(bands)
    assert state == "fatigued"
    assert 0.0 < confidence <= 1.0


def test_classify_idle_for_balanced_bands():
    """No dominant band → idle state."""
    bands = {"delta": 0.2, "theta": 0.2, "alpha": 0.2, "beta": 0.2, "gamma": 0.2}
    state, confidence = classify_state(bands)
    assert state == "idle"


def test_classify_handles_zero_values():
    """Should not crash on zero band powers."""
    bands = {"delta": 0.0, "theta": 0.0, "alpha": 0.0, "beta": 0.0, "gamma": 0.0}
    state, confidence = classify_state(bands)
    assert isinstance(state, str)
    assert isinstance(confidence, float)


def test_decode_intent_returns_brain_intent():
    """decode_intent should return a BrainIntent with all fields."""
    bands = {"delta": 0.1, "theta": 0.1, "alpha": 0.2, "beta": 0.6, "gamma": 0.1}
    intent = decode_intent(bands)
    assert isinstance(intent, BrainIntent)
    assert intent.state == "focused"
    assert len(intent.text) > 0
    assert 0.0 < intent.confidence <= 1.0
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd app && python -m pytest tests/test_decoder.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'bci_agent.decoder'`

- [ ] **Step 3: Implement decoder.py**

```python
# app/src/bci_agent/decoder.py
"""Brain state classification and intent mapping."""
from dataclasses import dataclass


@dataclass
class BrainIntent:
    state: str  # focused, relaxed, fatigued, command, idle
    confidence: float  # 0.0 ~ 1.0
    text: str  # Natural language intent description


def classify_state(bands: dict[str, float]) -> tuple[str, float]:
    """Classify brain state from frequency band powers.

    Uses simple ratio rules (MVP). Replace with ML model later.

    Returns:
        (state_name, confidence)
    """
    alpha = max(bands.get("alpha", 0), 1e-6)
    beta = max(bands.get("beta", 0), 1e-6)
    theta = max(bands.get("theta", 0), 1e-6)
    gamma = bands.get("gamma", 0)

    ratio_beta_alpha = beta / alpha
    ratio_alpha_beta = alpha / beta
    ratio_theta_alpha = theta / alpha

    if ratio_beta_alpha > 2.0:
        return "focused", min(ratio_beta_alpha / 4.0, 1.0)
    if ratio_alpha_beta > 2.0:
        return "relaxed", min(ratio_alpha_beta / 4.0, 1.0)
    if ratio_theta_alpha > 1.5:
        return "fatigued", min(ratio_theta_alpha / 3.0, 1.0)
    if beta > 0.5 and gamma > 0.3:
        return "command", 0.6
    return "idle", 0.3


_INTENT_TEXT = {
    "focused": "用户进入高度专注状态，可能正在集中注意力思考某个问题",
    "relaxed": "用户处于放松状态，可能在休息或冥想",
    "fatigued": "检测到认知疲劳信号，用户可能需要休息",
    "command": "检测到意图命令信号，用户想要执行某个操作",
    "idle": "用户处于空闲状态",
}


def decode_intent(bands: dict[str, float]) -> BrainIntent:
    """Full pipeline: band powers → brain state → intent."""
    state, confidence = classify_state(bands)
    text = _INTENT_TEXT.get(state, "未知状态")
    return BrainIntent(state=state, confidence=confidence, text=text)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd app && python -m pytest tests/test_decoder.py -v
```

Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/bci_agent/decoder.py app/tests/test_decoder.py
git commit -m "feat: add brain state decoder with frequency ratio classification"
```

---

## Chunk 2: LangGraph Agent + Integration

### Task 4: Agent Tools

**Files:**
- Create: `app/src/bci_agent/tools.py`

- [ ] **Step 1: Implement tools.py**

```python
# app/src/bci_agent/tools.py
"""Tools available to the BCI Agent."""
from datetime import datetime
from langchain_core.tools import tool


@tool
def get_current_time() -> str:
    """获取当前日期和时间。"""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


@tool
def take_note(content: str) -> str:
    """记录一条笔记到本地文件。

    Args:
        content: 笔记内容
    """
    timestamp = datetime.now().strftime("%H:%M:%S")
    with open("notes.txt", "a") as f:
        f.write(f"[{timestamp}] {content}\n")
    return f"已记录: {content}"


@tool
def suggest_activity(brain_state: str) -> str:
    """基于当前脑状态推荐合适的活动。

    Args:
        brain_state: 当前脑状态 (focused/relaxed/fatigued/command)
    """
    suggestions = {
        "focused": "专注度高，适合处理复杂任务：编程、写作、学习新概念",
        "relaxed": "状态放松，适合：创意思考、头脑风暴、轻松阅读",
        "fatigued": "检测到疲劳，建议：休息5分钟、深呼吸、喝水、站起来走动",
        "command": "已准备好接收指令，请下达命令",
    }
    return suggestions.get(brain_state, "继续保持当前状态")
```

- [ ] **Step 2: Commit**

```bash
git add app/src/bci_agent/tools.py
git commit -m "feat: add agent tools (time, notes, activity suggestions)"
```

---

### Task 5: LangGraph Agent

**Files:**
- Create: `app/tests/test_agent.py`
- Create: `app/src/bci_agent/agent.py`

- [ ] **Step 1: Write failing tests for graph structure**

```python
# app/tests/test_agent.py
from unittest.mock import patch, MagicMock
from bci_agent.agent import build_graph, interpret_intent, AgentState


def test_build_graph_returns_compiled_graph():
    """build_graph should return a compiled LangGraph."""
    graph = build_graph()
    assert graph is not None
    assert hasattr(graph, "invoke")


def test_interpret_intent_creates_messages():
    """interpret_intent should produce system + human messages."""
    state: AgentState = {
        "brain_state": "focused",
        "confidence": 0.8,
        "intent_text": "用户进入高度专注状态",
        "band_powers": {"alpha": 0.2, "beta": 0.6},
        "messages": [],
        "response": "",
    }
    result = interpret_intent(state)
    assert "messages" in result
    assert len(result["messages"]) == 2  # system + human


def test_graph_invoke_with_mocked_llm():
    """Graph should produce a response when invoked with mock LLM."""
    mock_response = MagicMock()
    mock_response.content = "检测到您正处于高度专注状态，建议继续当前任务。"
    mock_response.tool_calls = []

    with patch("bci_agent.agent.ChatOpenAI") as MockLLM:
        mock_instance = MagicMock()
        mock_instance.bind_tools.return_value = mock_instance
        mock_instance.invoke.return_value = mock_response
        MockLLM.return_value = mock_instance

        graph = build_graph()
        result = graph.invoke({
            "brain_state": "focused",
            "confidence": 0.8,
            "intent_text": "用户进入高度专注状态",
            "band_powers": {"alpha": 0.2, "beta": 0.6},
            "messages": [],
            "response": "",
        })

    assert result["response"] != ""
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd app && python -m pytest tests/test_agent.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'bci_agent.agent'`

- [ ] **Step 3: Implement agent.py**

```python
# app/src/bci_agent/agent.py
"""LangGraph agent for processing BCI-decoded intentions."""
import os
from typing import Literal, TypedDict

from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode

from .tools import get_current_time, suggest_activity, take_note

TOOLS = [get_current_time, take_note, suggest_activity]

DEFAULT_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/coding/v3"
DEFAULT_ARK_CHAT_MODEL = "doubao-seed-2-0-code-preview-260215"

SYSTEM_PROMPT = """\
你是一个脑机接口 AI Agent。你通过 BCI 设备接收用户的脑电信号，\
将解码后的意图转化为有用的响应和行动。

当前脑状态: {brain_state}
置信度: {confidence:.0%}
频带能量: {band_powers}

根据用户的脑状态和解码意图，提供有帮助的中文响应。\
你可以使用工具来执行操作。保持回复简洁。"""


class AgentState(TypedDict):
    brain_state: str
    confidence: float
    intent_text: str
    band_powers: dict
    messages: list[BaseMessage]
    response: str


def interpret_intent(state: AgentState) -> dict:
    """Convert brain state into LLM-ready messages."""
    system = SYSTEM_PROMPT.format(
        brain_state=state["brain_state"],
        confidence=state["confidence"],
        band_powers=state["band_powers"],
    )
    messages = [
        SystemMessage(content=system),
        HumanMessage(content=f"[BCI 意图解码] {state['intent_text']}"),
    ]
    return {"messages": messages}


def call_llm(state: AgentState) -> dict:
    """Invoke Ark CodingPlan with tool bindings."""
    llm = ChatOpenAI(
        model=os.environ.get("ARK_CHAT_MODEL", DEFAULT_ARK_CHAT_MODEL),
        base_url=os.environ.get("ARK_BASE_URL", DEFAULT_ARK_BASE_URL),
        api_key=os.environ.get("ARK_API_KEY", ""),
    ).bind_tools(TOOLS)
    response = llm.invoke(state["messages"])
    return {"messages": state["messages"] + [response]}


def format_response(state: AgentState) -> dict:
    """Extract the final text response from the last message."""
    last = state["messages"][-1]
    text = last.content if isinstance(last.content, str) else str(last.content)
    return {"response": text}


def _route_after_llm(state: AgentState) -> Literal["tools", "respond"]:
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return "respond"


def build_graph():
    """Build and compile the BCI Agent LangGraph."""
    tool_node = ToolNode(TOOLS)

    g = StateGraph(AgentState)
    g.add_node("interpret", interpret_intent)
    g.add_node("llm", call_llm)
    g.add_node("tools", tool_node)
    g.add_node("respond", format_response)

    g.set_entry_point("interpret")
    g.add_edge("interpret", "llm")
    g.add_conditional_edges("llm", _route_after_llm, {
        "tools": "tools",
        "respond": "respond",
    })
    g.add_edge("tools", "llm")
    g.add_edge("respond", END)

    return g.compile()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd app && python -m pytest tests/test_agent.py -v
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/bci_agent/agent.py app/tests/test_agent.py
git commit -m "feat: add LangGraph agent with tool routing"
```

---

### Task 6: Main Loop Integration

**Files:**
- Create: `app/src/bci_agent/main.py`

- [ ] **Step 1: Implement main.py**

```python
# app/src/bci_agent/main.py
"""BCI Agent MVP - main entry point."""
import signal as sig
import sys
import time

from .agent import build_graph
from .decoder import decode_intent
from .signal import SignalSource, extract_band_powers


def main():
    print("=== BCI Agent MVP ===")
    print("BrainFlow Synthetic Board (模拟数据)")
    print("Ctrl+C 停止\n")

    source = SignalSource()
    graph = build_graph()
    last_state = "idle"

    running = True

    def on_exit(_sig, _frame):
        nonlocal running
        running = False

    sig.signal(sig.SIGINT, on_exit)

    source.start()
    print("[启动] 信号采集已开始\n")

    try:
        while running:
            # 1. Capture
            eeg = source.read(duration_s=1.0)

            # 2. Process
            bands = extract_band_powers(eeg, source.sampling_rate)

            # 3. Decode
            intent = decode_intent(bands)

            # 4. Display
            print(
                f"[脑状态] {intent.state:8s} "
                f"(置信度: {intent.confidence:.0%}) | "
                f"α:{bands['alpha']:.3f} β:{bands['beta']:.3f} "
                f"θ:{bands['theta']:.3f} γ:{bands['gamma']:.3f}"
            )

            # 5. On meaningful state change → invoke agent
            if (
                intent.state != last_state
                and intent.state != "idle"
                and intent.confidence >= 0.5
            ):
                print(f"\n>>> 意图: {intent.text}")
                result = graph.invoke(
                    {
                        "brain_state": intent.state,
                        "confidence": intent.confidence,
                        "intent_text": intent.text,
                        "band_powers": bands,
                        "messages": [],
                        "response": "",
                    }
                )
                print(f"<<< Agent: {result['response']}\n")
                last_state = intent.state

            time.sleep(1)
    finally:
        source.stop()
        print("\n[停止] BCI Agent 已关闭")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Verify the full module imports correctly**

```bash
cd app && python -c "from bci_agent.main import main; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Run all tests**

```bash
cd app && python -m pytest tests/ -v
```

Expected: All 12 tests PASS

- [ ] **Step 4: Commit**

```bash
git add app/src/bci_agent/main.py
git commit -m "feat: add main loop integrating signal capture, decoder, and agent"
```

---

### Task 7: End-to-End Demo Run

- [ ] **Step 1: Set up API key**

```bash
cd app && cp .env.example .env
# Edit .env and add your real ARK_API_KEY
```

- [ ] **Step 2: Run the BCI Agent**

```bash
cd app && python -m bci_agent.main
```

Expected output (example):
```
=== BCI Agent MVP ===
BrainFlow Synthetic Board (模拟数据)
Ctrl+C 停止

[启动] 信号采集已开始

[脑状态] idle     (置信度: 30%) | α:0.234 β:0.189 θ:0.156 γ:0.098
[脑状态] focused  (置信度: 75%) | α:0.134 β:0.489 θ:0.156 γ:0.098

>>> 意图: 用户进入高度专注状态，可能正在集中注意力思考某个问题
<<< Agent: 检测到您正处于高度专注状态！当前非常适合处理复杂任务...

[脑状态] relaxed  (置信度: 65%) | α:0.534 β:0.189 θ:0.156 γ:0.098

>>> 意图: 用户处于放松状态，可能在休息或冥想
<<< Agent: 您已进入放松状态，这是一个很好的休息节奏...
```

- [ ] **Step 3: Verify Ctrl+C graceful shutdown**

Press Ctrl+C. Expected: `[停止] BCI Agent 已关闭`

- [ ] **Step 4: Final commit**

```bash
git add -A app/
git commit -m "feat: complete BCI Agent MVP with LangGraph + BrainFlow"
```
