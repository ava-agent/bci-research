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
