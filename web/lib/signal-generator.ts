// Synthetic multi-channel EEG signal generator
// Produces realistic brain-wave data for visualization and testing

export type BrainState = "focused" | "relaxed" | "fatigued" | "command" | "idle";

export interface SignalPoint {
  timestamp: number;
  channels: number[];
}

export const SAMPLING_RATE = 250; // Hz
export const NUM_CHANNELS = 4;

export const BANDS = {
  delta: 2,
  theta: 6,
  alpha: 10,
  beta: 20,
  gamma: 40,
} as const;

type BandAmplitudes = Record<keyof typeof BANDS, number>;

function gaussianNoise(): number {
  // Box-Muller transform for Gaussian-distributed random values
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class SignalGenerator {
  static readonly STATE_PROFILES: Record<BrainState, BandAmplitudes> = {
    focused: { delta: 0.1, theta: 0.1, alpha: 0.2, beta: 0.8, gamma: 0.5 },
    relaxed: { delta: 0.1, theta: 0.2, alpha: 0.8, beta: 0.2, gamma: 0.1 },
    fatigued: { delta: 0.3, theta: 0.7, alpha: 0.3, beta: 0.1, gamma: 0.1 },
    command: { delta: 0.1, theta: 0.1, alpha: 0.2, beta: 0.7, gamma: 0.6 },
    idle: { delta: 0.3, theta: 0.3, alpha: 0.3, beta: 0.3, gamma: 0.3 },
  };

  private state: BrainState = "idle";
  private currentAmplitudes: BandAmplitudes;
  private targetAmplitudes: BandAmplitudes;
  private phaseOffsets: number[][]; // [channel][band]
  private sampleIndex: number = 0;
  private noiseLevel: number = 0.05;

  constructor(initialState: BrainState = "idle") {
    this.state = initialState;
    this.currentAmplitudes = { ...SignalGenerator.STATE_PROFILES[initialState] };
    this.targetAmplitudes = { ...SignalGenerator.STATE_PROFILES[initialState] };

    // Initialize random phase offsets per channel per band for spatial diversity
    const bandKeys = Object.keys(BANDS) as (keyof typeof BANDS)[];
    this.phaseOffsets = [];
    for (let ch = 0; ch < NUM_CHANNELS; ch++) {
      this.phaseOffsets[ch] = [];
      for (let b = 0; b < bandKeys.length; b++) {
        this.phaseOffsets[ch][b] = Math.random() * 2 * Math.PI;
      }
    }
  }

  setState(state: BrainState): void {
    this.state = state;
    this.targetAmplitudes = { ...SignalGenerator.STATE_PROFILES[state] };
  }

  getState(): BrainState {
    return this.state;
  }

  generate(numSamples: number): SignalPoint[] {
    const points: SignalPoint[] = [];
    const bandKeys = Object.keys(BANDS) as (keyof typeof BANDS)[];
    const lerpFactor = 0.05;

    for (let i = 0; i < numSamples; i++) {
      // Smooth transition from current amplitudes toward target
      for (const band of bandKeys) {
        this.currentAmplitudes[band] = lerp(
          this.currentAmplitudes[band],
          this.targetAmplitudes[band],
          lerpFactor
        );
      }

      const t = this.sampleIndex / SAMPLING_RATE;
      const channels: number[] = [];

      for (let ch = 0; ch < NUM_CHANNELS; ch++) {
        let value = 0;
        for (let b = 0; b < bandKeys.length; b++) {
          const band = bandKeys[b];
          const freq = BANDS[band];
          const amp = this.currentAmplitudes[band];
          const phase = this.phaseOffsets[ch][b];
          value += amp * Math.sin(2 * Math.PI * freq * t + phase);
        }
        // Add Gaussian noise
        value += this.noiseLevel * gaussianNoise();
        channels.push(value);
      }

      points.push({
        timestamp: t,
        channels,
      });

      this.sampleIndex++;
    }

    return points;
  }
}
