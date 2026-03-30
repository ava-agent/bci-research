import numpy as np
from bci_agent.signal import extract_band_powers


def test_extract_band_powers_returns_five_bands():
    """Band powers should contain delta, theta, alpha, beta, gamma."""
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
