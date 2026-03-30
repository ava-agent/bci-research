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
