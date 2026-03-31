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

export default function Home() {
  const engine = useBciEngine();
  const lastStateRef = useRef("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const msgIdRef = useRef(0);

  const addMessage = useCallback((type: ChatMessage["type"], text: string) => {
    const id = String(++msgIdRef.current);
    setMessages((prev) => [...prev, { id, type, text }]);
  }, []);

  const invokeAgent = useCallback(
    async (state: string, confidence: number, bands: BandPowers, message?: string) => {
      setLoading(true);
      try {
        const response = await callAgent({ state, confidence, bands, message });
        addMessage("agent", response);
      } catch (e) {
        addMessage("agent", `[错误] ${e instanceof Error ? e.message : "Agent 调用失败"}`);
      } finally {
        setLoading(false);
      }
    },
    [addMessage],
  );

  // Auto-invoke agent on state change
  useEffect(() => {
    const { state, confidence } = engine.decoded;
    if (state !== lastStateRef.current && state !== "idle" && confidence >= 0.5) {
      addMessage("system", `脑状态变化: ${lastStateRef.current} → ${state}`);
      invokeAgent(state, confidence, engine.bands);
      lastStateRef.current = state;
    }
  }, [engine.decoded, engine.bands, addMessage, invokeAgent]);

  // Auto-start on mount
  useEffect(() => {
    engine.start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = (text: string) => {
    addMessage("user", text);
    invokeAgent(engine.decoded.state, engine.decoded.confidence, engine.bands, text);
  };

  const handleSwitch = (state: BrainState) => {
    engine.switchState(state);
    // Immediately trigger agent on manual switch (don't wait for classifier)
    if (state !== "idle" && !loading) {
      lastStateRef.current = state;
      addMessage("system", `手动切换脑状态: → ${state}`);
      invokeAgent(state, 0.9, engine.bands);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
            B
          </div>
          <span className="font-bold text-slate-800">BCI Agent</span>
          <span className="text-xs text-slate-400 ml-2">脑机接口 AI 智能体</span>
        </div>
        <StateSwitcher current={engine.decoded.state} onSwitch={handleSwitch} />
      </nav>

      {/* Main */}
      <div className="flex gap-4 p-4 h-[calc(100vh-57px)]">
        {/* Left: signal viz 60% */}
        <div className="flex-[3] flex flex-col gap-3 min-w-0">
          <StatusCards
            state={engine.decoded.state}
            confidence={engine.decoded.confidence}
            isRunning={engine.isRunning}
          />
          <div className="flex-1">
            <WaveformChart data={engine.waveform} />
          </div>
          <BandBars bands={engine.bands} />
        </div>

        {/* Right: AI chat 40% */}
        <div className="flex-[2] min-w-0">
          <ChatPanel messages={messages} onSend={handleSend} loading={loading} />
        </div>
      </div>
    </div>
  );
}
