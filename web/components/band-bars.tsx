"use client";

import type { BandPowers } from "@/lib/band-analyzer";

const BAND_CONFIG: { key: keyof BandPowers; label: string; color: string }[] = [
  { key: "delta", label: "δ", color: "#c7d2fe" },
  { key: "theta", label: "θ", color: "#a5b4fc" },
  { key: "alpha", label: "α", color: "#818cf8" },
  { key: "beta",  label: "β", color: "#6366f1" },
  { key: "gamma", label: "γ", color: "#4f46e5" },
];

interface BandBarsProps {
  bands: BandPowers;
}

export default function BandBars({ bands }: BandBarsProps) {
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
              <span className="text-xs text-gray-600">{band.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
