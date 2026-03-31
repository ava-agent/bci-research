// FFT band power extraction and brain state classification
// TypeScript port of the Python decoder (app/src/bci_agent/decoder.py)

import type { SignalPoint } from "./signal-generator";
import { SAMPLING_RATE } from "./signal-generator";

// ── Interfaces ──────────────────────────────────────────────────────────

export interface BandPowers {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface BrainDecoded {
  state: string;
  confidence: number;
  intent: string;
  bands: BandPowers;
}

// ── Band frequency ranges (Hz) ──────────────────────────────────────────

const BAND_RANGES: Record<keyof BandPowers, [number, number]> = {
  delta: [1, 4],
  theta: [4, 8],
  alpha: [8, 13],
  beta: [13, 30],
  gamma: [30, 45],
};

// ── Intent text mapping ─────────────────────────────────────────────────

const INTENT_TEXT: Record<string, string> = {
  focused: "用户进入高度专注状态，可能正在集中注意力思考某个问题",
  relaxed: "用户处于放松状态，可能在休息或冥想",
  fatigued: "检测到认知疲劳信号，用户可能需要休息",
  command: "检测到意图命令信号，用户想要执行某个操作",
  idle: "用户处于空闲状态",
};

// ── DFT-based band power extraction ─────────────────────────────────────

/**
 * Extract frequency band powers from an array of EEG signal points.
 *
 * For each channel, computes a DFT at integer frequency bins within each
 * band range, averages across channels, and normalizes so powers sum to 1.
 */
export function extractBandPowers(points: SignalPoint[]): BandPowers {
  const n = points.length;
  if (n === 0) {
    return { delta: 0.2, theta: 0.2, alpha: 0.2, beta: 0.2, gamma: 0.2 };
  }

  const numChannels = points[0].channels.length;
  const bandKeys = Object.keys(BAND_RANGES) as (keyof BandPowers)[];

  // Accumulate power per band, averaged across channels
  const bandPower: BandPowers = { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };

  for (let ch = 0; ch < numChannels; ch++) {
    // Extract single-channel signal
    const signal: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      signal[i] = points[i].channels[ch];
    }

    for (const band of bandKeys) {
      const [fLow, fHigh] = BAND_RANGES[band];

      // Convert frequency range to DFT bin indices: k = f * n / sampleRate
      const kLow = Math.ceil((fLow * n) / SAMPLING_RATE);
      const kHigh = Math.floor((fHigh * n) / SAMPLING_RATE);

      let power = 0;
      let binCount = 0;

      for (let k = kLow; k <= kHigh; k++) {
        if (k < 0 || k >= n) continue;

        // DFT at bin k: X[k] = sum( x[i] * e^(-j*2*pi*k*i/n) )
        let re = 0;
        let im = 0;
        for (let i = 0; i < n; i++) {
          const angle = (2 * Math.PI * k * i) / n;
          re += signal[i] * Math.cos(angle);
          im -= signal[i] * Math.sin(angle);
        }
        power += (re * re + im * im) / (n * n);
        binCount++;
      }

      bandPower[band] += binCount > 0 ? power : 0;
    }
  }

  // Average across channels
  if (numChannels > 0) {
    for (const band of bandKeys) {
      bandPower[band] /= numChannels;
    }
  }

  // Normalize so all band powers sum to 1
  const total = bandKeys.reduce((sum, band) => sum + bandPower[band], 0);
  if (total > 0) {
    for (const band of bandKeys) {
      bandPower[band] /= total;
    }
  } else {
    // Uniform distribution fallback
    for (const band of bandKeys) {
      bandPower[band] = 1 / bandKeys.length;
    }
  }

  return bandPower;
}

// ── Brain state classification ──────────────────────────────────────────

/**
 * Classify brain state from normalized band powers using frequency-ratio rules.
 *
 * Ported from Python `classify_state()` with adjusted thresholds for the
 * normalized power representation used by the web front-end.
 */
export function classifyState(bands: BandPowers): BrainDecoded {
  const alpha = Math.max(bands.alpha, 1e-6);
  const beta = Math.max(bands.beta, 1e-6);
  const theta = Math.max(bands.theta, 1e-6);
  const gamma = bands.gamma;

  const ratioBetaAlpha = beta / alpha;
  const ratioAlphaBeta = alpha / beta;
  const ratioThetaAlpha = theta / alpha;

  let state: string;
  let confidence: number;

  // Check command first: high beta AND high gamma distinguishes from pure focused
  if (beta > 0.25 && gamma > 0.15 && gamma / beta > 0.5) {
    state = "command";
    confidence = 0.7;
  } else if (ratioBetaAlpha > 2.0) {
    state = "focused";
    confidence = Math.min(ratioBetaAlpha / 4, 1);
  } else if (ratioAlphaBeta > 2.0) {
    state = "relaxed";
    confidence = Math.min(ratioAlphaBeta / 4, 1);
  } else if (ratioThetaAlpha > 1.5) {
    state = "fatigued";
    confidence = Math.min(ratioThetaAlpha / 3, 1);
  } else {
    state = "idle";
    confidence = 0.3;
  }

  const intent = INTENT_TEXT[state] ?? "未知状态";

  return { state, confidence, intent, bands };
}
