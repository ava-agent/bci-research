"""LangGraph agent for processing BCI-decoded intentions."""
from typing import Literal, TypedDict

from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode

from .tools import get_current_time, suggest_activity, take_note

TOOLS = [get_current_time, take_note, suggest_activity]

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
    """Invoke GLM with tool bindings."""
    llm = ChatOpenAI(
        model="glm-4-flash",
        base_url="https://open.bigmodel.cn/api/paas/v4/",
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
