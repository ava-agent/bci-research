"use client";

import { memo } from "react";
import type { BandPowers } from "@/lib/band-analyzer";

const BAND_CONFIG: { key: keyof BandPowers; label: string; color: string; name: string }[] = [
  { key: "delta", label: "δ", color: "#3b82f6", name: "Delta (0.5-4 Hz) - 深睡" },
  { key: "theta", label: "θ", color: "#10b981", name: "Theta (4-8 Hz) - 冥想" },
  { key: "alpha", label: "α", color: "#f59e0b", name: "Alpha (8-13 Hz) - 放松" },
  { key: "beta",  label: "β", color: "#f97316", name: "Beta (13-30 Hz) - 专注" },
  { key: "gamma", label: "γ", color: "#ef4444", name: "Gamma (30-45 Hz) - 认知" },
];

interface BandBarsProps {
  bands: BandPowers;
}

function BandBars({ bands }: BandBarsProps) {
  const maxValue = Math.max(...BAND_CONFIG.map((b) => bands[b.key]), 1e-6);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="text-xs text-gray-500 mb-2">频带能量</div>
      <div className="flex items-end justify-around h-32">
        {BAND_CONFIG.map((band) => {
          const value = bands[band.key];
          const pct = (value / maxValue) * 100;

          return (
            <div key={band.key} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] text-gray-500">
                {Math.round(value * 100)}%
              </span>
              <div
                className="w-6 rounded-sm transition-all duration-300"
                style={{
                  height: `${pct}%`,
                  backgroundColor: band.color,
                }}
              />
              <span className="text-xs text-gray-600" title={band.name}>{band.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(BandBars);
