"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  SignalGenerator,
  SAMPLING_RATE,
  type SignalPoint,
  type BrainState,
} from "@/lib/signal-generator";
import {
  classifyState,
  type BandPowers,
  type BrainDecoded,
} from "@/lib/band-analyzer";

// ── Constants ───────────────────────────────────────────────────────────

const WINDOW_SECONDS = 10;
const MAX_POINTS = SAMPLING_RATE * WINDOW_SECONDS;
const GENERATE_INTERVAL_MS = 100;
const ANALYZE_INTERVAL_MS = 1000;
const SAMPLES_PER_TICK = Math.round(
  SAMPLING_RATE * (GENERATE_INTERVAL_MS / 1000)
);

// ── Ring Buffer for efficient memory usage ───────────────────────────────

class RingBuffer<T> {
  private buffer: T[];
  private head = 0;
  private size = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size++;
  }

  pushMany(items: T[]) {
    for (const item of items) {
      this.push(item);
    }
  }

  toArray(): T[] {
    const result = new Array(this.size);
    for (let i = 0; i < this.size; i++) {
      const idx = (this.head - this.size + i + this.capacity) % this.capacity;
      result[i] = this.buffer[idx];
    }
    return result;
  }

  get length() {
    return this.size;
  }

  clear() {
    this.head = 0;
    this.size = 0;
  }
}

// ── Public interface ────────────────────────────────────────────────────

export interface BciEngineState {
  waveform: SignalPoint[];
  bands: BandPowers;
  decoded: BrainDecoded;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  switchState: (state: BrainState) => void;
}

// ── Default values ──────────────────────────────────────────────────────

const DEFAULT_BANDS: BandPowers = {
  delta: 0.2,
  theta: 0.2,
  alpha: 0.2,
  beta: 0.2,
  gamma: 0.2,
};

const DEFAULT_DECODED: BrainDecoded = {
  state: "idle",
  confidence: 0,
  intent: "用户处于空闲状态",
  bands: { ...DEFAULT_BANDS },
};

// ── Hook ────────────────────────────────────────────────────────────────

export function useBciEngine(): BciEngineState {
  const [waveform, setWaveform] = useState<SignalPoint[]>([]);
  const [bands, setBands] = useState<BandPowers>(DEFAULT_BANDS);
  const [decoded, setDecoded] = useState<BrainDecoded>(DEFAULT_DECODED);
  const [isRunning, setIsRunning] = useState(false);

  const generatorRef = useRef<SignalGenerator>(new SignalGenerator());
  const bufferRef = useRef<RingBuffer<SignalPoint>>(new RingBuffer(MAX_POINTS));
  const generateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingAnalysisRef = useRef(false);

  // Initialize Web Worker
  useEffect(() => {
    if (typeof window !== "undefined" && "Worker" in window) {
      try {
        workerRef.current = new Worker(
          new URL("@/lib/band-analyzer.worker.ts", import.meta.url)
        );
        workerRef.current.onmessage = (e: MessageEvent<BandPowers>) => {
          const newBands = e.data;
          setBands(newBands);
          setDecoded(classifyState(newBands));
          pendingAnalysisRef.current = false;
        };
      } catch (err) {
        console.warn("Web Worker not available, falling back to main thread", err);
      }
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const generate = useCallback(() => {
    const points = generatorRef.current.generate(SAMPLES_PER_TICK);
    bufferRef.current.pushMany(points);
    setWaveform(bufferRef.current.toArray());
  }, []);

  const analyze = useCallback(() => {
    const buffer = bufferRef.current;
    if (buffer.length < SAMPLING_RATE) return;

    // Use Web Worker if available
    if (workerRef.current && !pendingAnalysisRef.current) {
      pendingAnalysisRef.current = true;
      const analysisWindow = buffer.toArray().slice(-SAMPLING_RATE);
      workerRef.current.postMessage({
        signal: analysisWindow,
        samplingRate: SAMPLING_RATE,
      });
    } else if (!workerRef.current) {
      // Fallback to main thread
      import("@/lib/band-analyzer").then(({ extractBandPowers }) => {
        const analysisWindow = buffer.toArray().slice(-SAMPLING_RATE);
        const newBands = extractBandPowers(analysisWindow);
        setBands(newBands);
        setDecoded(classifyState(newBands));
      });
    }
  }, []);

  const start = useCallback(() => {
    if (generateTimerRef.current) return;

    generateTimerRef.current = setInterval(generate, GENERATE_INTERVAL_MS);
    analyzeTimerRef.current = setInterval(analyze, ANALYZE_INTERVAL_MS);
    setIsRunning(true);
  }, [generate, analyze]);

  const stop = useCallback(() => {
    if (generateTimerRef.current) {
      clearInterval(generateTimerRef.current);
      generateTimerRef.current = null;
    }
    if (analyzeTimerRef.current) {
      clearInterval(analyzeTimerRef.current);
      analyzeTimerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const switchState = useCallback((state: BrainState) => {
    generatorRef.current.setState(state);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (generateTimerRef.current) {
        clearInterval(generateTimerRef.current);
        generateTimerRef.current = null;
      }
      if (analyzeTimerRef.current) {
        clearInterval(analyzeTimerRef.current);
        analyzeTimerRef.current = null;
      }
      bufferRef.current.clear();
      workerRef.current?.terminate();
    };
  }, []);

  return {
    waveform,
    bands,
    decoded,
    isRunning,
    start,
    stop,
    switchState,
  };
}
