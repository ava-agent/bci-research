"use client";

import type { BrainState } from "@/lib/signal-generator";

const STATES: { value: BrainState; label: string }[] = [
  { value: "focused", label: "专注" },
  { value: "relaxed", label: "放松" },
  { value: "fatigued", label: "疲劳" },
  { value: "command", label: "指令" },
];

interface StateSwitcherProps {
  current: string;
  onSwitch: (state: BrainState) => void;
}

export default function StateSwitcher({ current, onSwitch }: StateSwitcherProps) {
  return (
    <div className="flex gap-2">
      {STATES.map((s) => (
        <button
          key={s.value}
          onClick={() => onSwitch(s.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            current === s.value
              ? "bg-indigo-500 text-white"
              : "bg-white text-slate-600 hover:bg-indigo-50 shadow-sm"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
