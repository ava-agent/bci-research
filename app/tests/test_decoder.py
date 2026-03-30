from bci_agent.decoder import classify_state, decode_intent, BrainIntent


def test_classify_focused_when_beta_dominates():
    """High beta/alpha ratio -> focused state."""
    bands = {"delta": 0.1, "theta": 0.1, "alpha": 0.2, "beta": 0.6, "gamma": 0.1}
    state, confidence = classify_state(bands)
    assert state == "focused"
    assert 0.0 < confidence <= 1.0


def test_classify_relaxed_when_alpha_dominates():
    """High alpha/beta ratio -> relaxed state."""
    bands = {"delta": 0.1, "theta": 0.1, "alpha": 0.6, "beta": 0.2, "gamma": 0.1}
    state, confidence = classify_state(bands)
    assert state == "relaxed"
    assert 0.0 < confidence <= 1.0


def test_classify_fatigued_when_theta_dominates():
    """High theta/alpha ratio -> fatigued state."""
    bands = {"delta": 0.1, "theta": 0.6, "alpha": 0.2, "beta": 0.1, "gamma": 0.1}
    state, confidence = classify_state(bands)
    assert state == "fatigued"
    assert 0.0 < confidence <= 1.0


def test_classify_idle_for_balanced_bands():
    """No dominant band -> idle state."""
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
