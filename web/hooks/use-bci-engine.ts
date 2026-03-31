"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  SignalGenerator,
  SAMPLING_RATE,
  type SignalPoint,
  type BrainState,
} from "@/lib/signal-generator";
import {
  extractBandPowers,
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
  const bufferRef = useRef<SignalPoint[]>([]);
  const generateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = useCallback(() => {
    const points = generatorRef.current.generate(SAMPLES_PER_TICK);
    const buffer = bufferRef.current;
    buffer.push(...points);

    // Keep only the last MAX_POINTS samples
    if (buffer.length > MAX_POINTS) {
      bufferRef.current = buffer.slice(buffer.length - MAX_POINTS);
    }

    setWaveform([...bufferRef.current]);
  }, []);

  const analyze = useCallback(() => {
    const buffer = bufferRef.current;
    if (buffer.length < SAMPLING_RATE) return;

    const analysisWindow = buffer.slice(buffer.length - SAMPLING_RATE);
    const newBands = extractBandPowers(analysisWindow);
    const newDecoded = classifyState(newBands);

    setBands(newBands);
    setDecoded(newDecoded);
  }, []);

  const start = useCallback(() => {
    if (generateTimerRef.current) return; // already running

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
      }
      if (analyzeTimerRef.current) {
        clearInterval(analyzeTimerRef.current);
      }
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
