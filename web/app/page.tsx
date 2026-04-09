"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useBciEngine } from "@/hooks/use-bci-engine";
import { callAgent } from "@/lib/agent-api";
import StatusCards from "@/components/status-cards";
import WaveformChart from "@/components/waveform-chart";
import BandBars from "@/components/band-bars";
import ChatPanel from "@/components/chat-panel";
import type { ChatMessage } from "@/components/chat-panel";
import StateSwitcher from "@/components/state-switcher";
import type { BrainState } from "@/lib/signal-generator";
import type { BandPowers } from "@/lib/band-analyzer";

const MAX_MESSAGES = 100;
const INVOKE_DEBOUNCE_MS = 300;
const AUTO_INVOKE_CONFIDENCE_THRESHOLD = 0.5;
const MANUAL_INVOKE_CONFIDENCE = 0.9;

export default function Home() {
  const engine = useBciEngine();
  const lastStateRef = useRef<string>(engine.decoded.state);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const msgIdRef = useRef(0);
  const invokeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Track mount state for async cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (invokeTimeoutRef.current) {
        clearTimeout(invokeTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const addMessage = useCallback((type: ChatMessage["type"], text: string) => {
    if (!isMountedRef.current) return;
    const id = `${Date.now()}-${++msgIdRef.current}`;
    setMessages((prev) => {
      const next = [...prev, { id, type, text }];
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });
  }, []);

  const invokeAgent = useCallback(
    async (state: string, confidence: number, bands: BandPowers, message?: string) => {
      // Clear previous timeout
      if (invokeTimeoutRef.current) {
        clearTimeout(invokeTimeoutRef.current);
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      invokeTimeoutRef.current = setTimeout(async () => {
        if (!isMountedRef.current) return;

        setLoading(true);
        try {
          const response = await callAgent(
            { state, confidence, bands, message },
            abortControllerRef.current?.signal
          );
          if (isMountedRef.current) {
            addMessage("agent", response);
          }
        } catch (e) {
          if (isMountedRef.current && e instanceof Error && e.name !== "AbortError") {
            addMessage("agent", `[错误] ${e.message || "Agent 调用失败"}`);
          }
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      }, INVOKE_DEBOUNCE_MS);
    },
    [addMessage]
  );

  // Auto-invoke agent on state change
  useEffect(() => {
    const { state, confidence } = engine.decoded;
    if (state !== lastStateRef.current && state !== "idle" && confidence >= AUTO_INVOKE_CONFIDENCE_THRESHOLD) {
      addMessage("system", `脑状态变化: ${lastStateRef.current} → ${state}`);
      invokeAgent(state, confidence, engine.bands);
    }
    lastStateRef.current = state;
  }, [engine.decoded, engine.bands, addMessage, invokeAgent]);

  // Auto-start on mount
  useEffect(() => {
    engine.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = (text: string) => {
    addMessage("user", text);
    invokeAgent(engine.decoded.state, engine.decoded.confidence, engine.bands, text);
  };

  const handleSwitch = (state: BrainState) => {
    engine.switchState(state);
    if (state !== "idle" && !loading) {
      lastStateRef.current = state;
      addMessage("system", `手动切换脑状态: → ${state}`);
      invokeAgent(state, MANUAL_INVOKE_CONFIDENCE, engine.bands);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
            B
          </div>
          <span className="font-bold text-slate-800">BCI Agent</span>
          <span className="text-xs text-slate-400 ml-2 hidden sm:inline">脑机接口 AI 智能体</span>
        </div>
        <StateSwitcher
          current={engine.decoded.state as BrainState}
          onSwitch={handleSwitch}
          disabled={loading}
        />
      </nav>

      {/* Main */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 h-[calc(100vh-57px)] overflow-auto">
        {/* Left: signal viz */}
        <div className="flex-[3] flex flex-col gap-3 min-w-0 order-2 lg:order-1">
          <StatusCards
            state={engine.decoded.state as BrainState}
            confidence={engine.decoded.confidence}
            isRunning={engine.isRunning}
          />
          <div className="flex-1 min-h-[200px]">
            <WaveformChart data={engine.waveform} />
          </div>
          <BandBars bands={engine.bands} />
        </div>

        {/* Right: AI chat */}
        <div className="flex-[2] min-w-0 order-1 lg:order-2 h-[300px] lg:h-auto">
          <ChatPanel messages={messages} onSend={handleSend} loading={loading} />
        </div>
      </div>
    </div>
  );
}
