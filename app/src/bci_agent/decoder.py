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
    """Full pipeline: band powers -> brain state -> intent."""
    state, confidence = classify_state(bands)
    text = _INTENT_TEXT.get(state, "未知状态")
    return BrainIntent(state=state, confidence=confidence, text=text)
