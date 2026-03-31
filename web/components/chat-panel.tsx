"use client";

import { useState, useRef, useEffect } from "react";

export interface ChatMessage {
  id: string;
  type: "system" | "agent" | "user";
  text: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  loading: boolean;
}

export default function ChatPanel({ messages, onSend, loading }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b font-semibold text-slate-700">
        AI Agent 对话
      </div>

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          if (msg.type === "user") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-indigo-500 text-white rounded-lg px-3 py-2 max-w-[80%] ml-auto">
                  {msg.text}
                </div>
              </div>
            );
          }

          if (msg.type === "system") {
            return (
              <div key={msg.id} className="bg-indigo-50 text-indigo-600 rounded-lg px-3 py-2 max-w-[80%]">
                <span className="text-xs font-semibold block mb-1">系统</span>
                {msg.text}
              </div>
            );
          }

          // agent
          return (
            <div key={msg.id} className="bg-slate-50 text-slate-700 rounded-lg px-3 py-2 max-w-[80%]">
              <span className="text-xs font-semibold block mb-1">BCI Agent</span>
              {msg.text}
            </div>
          );
        })}

        {loading && (
          <div className="bg-slate-50 text-slate-400 rounded-lg px-3 py-2 max-w-[80%] animate-pulse">
            Agent 思考中...
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t px-4 py-3 flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="输入消息..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
        >
          发送
        </button>
      </div>
    </div>
  );
}
