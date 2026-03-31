"""Cloudbase cloud function: BCI Agent powered by GLM-4-Flash."""

import json
import os
from typing import Literal, TypedDict

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode

# ---------------------------------------------------------------------------
# Tool
# ---------------------------------------------------------------------------

@tool
def suggest_activity(brain_state: str) -> str:
    """基于当前脑状态推荐合适的活动。

    Args:
        brain_state: 当前脑状态 (focused/relaxed/fatigued/command/idle)
    """
    suggestions = {
        "focused": "专注度高，适合处理复杂任务：编程、写作、学习新概念",
        "relaxed": "状态放松，适合：创意思考、头脑风暴、轻松阅读",
        "fatigued": "检测到疲劳，建议：休息5分钟、深呼吸、喝水、站起来走动",
        "command": "已准备好接收指令，请下达命令",
        "idle": "空闲状态，可以开始新的任务或继续休息",
    }
    return suggestions.get(brain_state, "继续保持当前状态")


TOOLS = [suggest_activity]

# ---------------------------------------------------------------------------
# Intent text mapping
# ---------------------------------------------------------------------------

INTENT_TEXT = {
    "focused": "用户进入高度专注状态，可能正在集中注意力思考某个问题",
    "relaxed": "用户处于放松状态，可能在休息或冥想",
    "fatigued": "检测到认知疲劳信号，用户可能需要休息",
    "command": "检测到意图命令信号，用户想要执行某个操作",
    "idle": "用户处于空闲状态",
}

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
你是一个脑机接口 AI Agent。你通过 BCI 设备接收用户的脑电信号，\
将解码后的意图转化为有用的响应和行动。

当前脑状态: {brain_state}
置信度: {confidence:.0%}
频带能量: {band_powers}

根据用户的脑状态和解码意图，提供有帮助的中文响应。\
你可以使用工具来执行操作。保持回复简洁。"""

# ---------------------------------------------------------------------------
# Agent state
# ---------------------------------------------------------------------------


class AgentState(TypedDict):
    brain_state: str
    confidence: float
    intent_text: str
    band_powers: dict
    messages: list[BaseMessage]
    response: str
    user_message: str


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------


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
    """Invoke GLM-4-Flash with tool bindings."""
    llm = ChatOpenAI(
        model="glm-4-flash",
        base_url="https://open.bigmodel.cn/api/paas/v4/",
        api_key=os.environ.get("GLM_API_KEY", ""),
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


# ---------------------------------------------------------------------------
# Build graph
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Cloudbase entry point
# ---------------------------------------------------------------------------

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def main(event, context):
    """Cloudbase cloud function handler.

    Receives brain state + optional user message, invokes GLM-4-Flash via
    LangGraph, and returns the agent response.
    """
    # Handle CORS preflight
    if isinstance(event, dict) and event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": "",
        }

    # Parse request body
    try:
        if isinstance(event, str):
            body = json.loads(event)
        elif isinstance(event, dict) and "body" in event:
            raw = event["body"]
            body = json.loads(raw) if isinstance(raw, str) else raw
        elif isinstance(event, dict):
            body = event
        else:
            body = {}
    except (json.JSONDecodeError, TypeError):
        return {
            "statusCode": 400,
            "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Invalid JSON body"}),
        }

    state_name = body.get("state", "idle")
    confidence = float(body.get("confidence", 0.5))
    bands = body.get("bands", {})
    user_message = body.get("message", "")

    # Build intent text
    intent_text = INTENT_TEXT.get(state_name, "未知状态")
    if user_message:
        intent_text += f"。用户说: {user_message}"

    # Invoke the agent
    try:
        graph = build_graph()
        result = graph.invoke({
            "brain_state": state_name,
            "confidence": confidence,
            "intent_text": intent_text,
            "band_powers": bands,
            "messages": [],
            "response": "",
            "user_message": user_message,
        })

        return {
            "statusCode": 200,
            "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
            "body": json.dumps({"response": result["response"]}, ensure_ascii=False),
        }
    except Exception as exc:
        return {
            "statusCode": 500,
            "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
            "body": json.dumps({"error": str(exc)}, ensure_ascii=False),
        }
