"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { SignalPoint } from "@/lib/signal-generator";

interface WaveformChartProps {
  data: SignalPoint[];
}

export default function WaveformChart({ data }: WaveformChartProps) {
  const option = useMemo(() => {
    const ch0 = data.map((p) => [p.timestamp, p.channels[0]]);
    const ch1 = data.map((p) => [p.timestamp, p.channels[1]]);

    const latest = data.length > 0 ? data[data.length - 1].timestamp : 0;

    return {
      animation: false,
      grid: { top: 10, right: 16, bottom: 30, left: 40 },
      xAxis: {
        type: "value" as const,
        min: latest - 10,
        max: latest,
        axisLabel: {
          formatter: (v: number) => `${Math.round(v)}s`,
        },
      },
      yAxis: {
        type: "value" as const,
        min: -3,
        max: 3,
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: [
        {
          name: "Ch1",
          type: "line" as const,
          data: ch0,
          showSymbol: false,
          lineStyle: { color: "#6366f1", width: 1.5 },
          itemStyle: { color: "#6366f1" },
        },
        {
          name: "Ch2",
          type: "line" as const,
          data: ch1,
          showSymbol: false,
          lineStyle: { color: "#a5b4fc", width: 1 },
          itemStyle: { color: "#a5b4fc" },
        },
      ],
    };
  }, [data]);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="text-xs text-gray-500 mb-2">实时脑波信号</div>
      <ReactECharts option={option} style={{ height: 200 }} />
    </div>
  );
}
