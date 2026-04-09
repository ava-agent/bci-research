/**
 * Web Worker for band power analysis
 * Offloads DFT computation from main thread
 */

interface BandPowers {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

interface SignalPoint {
  timestamp: number;
  channels: number[];
}

const BANDS = {
  delta: { low: 1, high: 4 },
  theta: { low: 4, high: 8 },
  alpha: { low: 8, high: 13 },
  beta: { low: 13, high: 30 },
  gamma: { low: 30, high: 45 },
};

function extractBandPowers(signal: SignalPoint[], samplingRate: number): BandPowers {
  const n = signal.length;
  if (n === 0) {
    return { delta: 0.2, theta: 0.2, alpha: 0.2, beta: 0.2, gamma: 0.2 };
  }

  const numChannels = signal[0].channels.length;
  const powers: BandPowers = { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };

  for (let ch = 0; ch < numChannels; ch++) {
    const samples = signal.map((p) => p.channels[ch]);

    // DFT for each band
    (Object.keys(BANDS) as (keyof typeof BANDS)[]).forEach((band) => {
      const { low, high } = BANDS[band];
      const kLow = Math.floor((low * n) / samplingRate);
      const kHigh = Math.floor((high * n) / samplingRate);

      let power = 0;
      for (let k = Math.max(1, kLow); k <= Math.min(kHigh, n / 2); k++) {
        let real = 0;
        let imag = 0;
        for (let i = 0; i < n; i++) {
          const angle = (2 * Math.PI * k * i) / n;
          real += samples[i] * Math.cos(angle);
          imag -= samples[i] * Math.sin(angle);
        }
        power += (real * real + imag * imag) / (n * n);
      }
      powers[band] += power;
    });
  }

  // Average across channels and normalize
  (Object.keys(powers) as (keyof BandPowers)[]).forEach((band) => {
    powers[band] /= numChannels;
  });

  const total = Object.values(powers).reduce((a, b) => a + b, 1e-10);
  (Object.keys(powers) as (keyof BandPowers)[]).forEach((band) => {
    powers[band] /= total;
  });

  return powers;
}

self.onmessage = (e: MessageEvent<{ signal: SignalPoint[]; samplingRate: number }>) => {
  const { signal, samplingRate } = e.data;
  const result = extractBandPowers(signal, samplingRate);
  self.postMessage(result);
};

export {};
