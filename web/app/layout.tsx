import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BCI Agent Demo - 脑机接口 AI 智能体",
  description: "实时脑波可视化 + AI Agent 交互演示",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
