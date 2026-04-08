"use client";

import { memo } from "react";
import type { BrainState } from "@/lib/signal-generator";

const STATE_LABELS: Record<BrainState, { label: string; bg: string; text: string }> = {
  focused:  { label: "专注", bg: "bg-indigo-100", text: "text-indigo-700" },
  relaxed:  { label: "放松", bg: "bg-green-100",  text: "text-green-700" },
  fatigued: { label: "疲劳", bg: "bg-red-100",    text: "text-red-700" },
  command:  { label: "指令", bg: "bg-purple-100", text: "text-purple-700" },
  idle:     { label: "空闲", bg: "bg-gray-100",   text: "text-gray-600" },
};

interface StatusCardsProps {
  state: BrainState;
  confidence: number;
  isRunning: boolean;
}

function StatusCards({ state, confidence, isRunning }: StatusCardsProps) {
  const info = STATE_LABELS[state] ?? STATE_LABELS.idle;

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Card 1: Brain State */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="text-xs text-gray-500 mb-1">脑状态</div>
        <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${info.bg} ${info.text}`}>
          {info.label}
        </span>
      </div>

      {/* Card 2: Confidence */}
      <div className="bg-white rounded-xl p-4 shadow-sm" role="status" aria-label="置信度">
        <div className="text-xs text-gray-500 mb-1">置信度</div>
        <div className="text-2xl font-bold" aria-live="polite">{Math.round(confidence * 100)}%</div>
      </div>

      {/* Card 3: Connection Status */}
      <div className="bg-white rounded-xl p-4 shadow-sm" role="status" aria-label="采集状态">
        <div className="text-xs text-gray-500 mb-1">状态</div>
        {isRunning ? (
          <div className="text-sm font-medium text-green-600 animate-pulse">● 采集中</div>
        ) : (
          <div className="text-sm font-medium text-gray-400">○ 已停止</div>
        )}
      </div>
    </div>
  );
}

export default memo(StatusCards);
