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
