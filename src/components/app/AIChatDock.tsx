/**
 * AI Research Chat Dock for NIGHTFIELD
 * Features:
 * - Streaming responses with Server-Sent Events (SSE) support
 * - Animated tool-call chips (e.g. get_price_history, get_regulatory_filings)
 * - "Numbers come from data tools" verification badge
 * - Inline financial metric cards and hyperlinked source citations
 * - Contextual prompt suggestions based on current stock/fund view
 * - Full-screen mobile overlay, collapsible right drawer on desktop
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  X,
  Search,
  FileText,
  ShieldCheck,
  Cpu,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { api, ChatMessage, ChatToolCall } from "../../lib/api";

interface AIChatDockProps {
  isOpen: boolean;
  onClose: () => void;
  activeSymbol?: string;
}

export const AIChatDock: React.FC<AIChatDockProps> = ({
  isOpen,
  onClose,
  activeSymbol,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to NIGHTFIELD Research Intelligence. I run autonomous queries across exchange tick data, SEC/BSE corporate filings, and valuation models to answer your investment theses.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeToolCalls, setActiveToolCalls] = useState<ChatToolCall[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = activeSymbol
    ? [
        `Is ${activeSymbol} trading above its 3-year historical P/E median?`,
        `Analyze ${activeSymbol} free cash flow yield and capital expenditures`,
        `What are the principal downside risks in ${activeSymbol}'s latest filing?`,
      ]
    : [
        "Compare Nifty 50 index funds by expense ratio and tracking error",
        "Which private banking stock has the highest return on equity?",
        "Explain the macroeconomic outlook for Indian IT services in 2026",
      ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, activeToolCalls, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isStreaming) return;

    setInput("");
    setActiveToolCalls([]);

    const userMsgId = "msg_" + Math.random().toString(36).substring(2, 9);
    const botMsgId = "msg_bot_" + Math.random().toString(36).substring(2, 9);

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    let accumulatedContent = "";

    // Add empty placeholder assistant message
    setMessages((prev) => [
      ...prev,
      {
        id: botMsgId,
        role: "assistant",
        content: "",
        toolCalls: [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    try {
      await api.streamChat({
        message: query,
        symbolContext: activeSymbol,
        onToolCall: (toolCall) => {
          setActiveToolCalls((prev) => {
            const existing = prev.find((t) => t.id === toolCall.id);
            if (existing) {
              return prev.map((t) => (t.id === toolCall.id ? toolCall : t));
            }
            return [...prev, toolCall];
          });
        },
        onChunk: (chunk) => {
          accumulatedContent += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId ? { ...msg, content: accumulatedContent } : msg
            )
          );
        },
        onComplete: ({ citations, keyData }) => {
          setIsStreaming(false);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId
                ? {
                    ...msg,
                    content: accumulatedContent,
                    toolCalls: [...activeToolCalls],
                    citations,
                    keyData,
                  }
                : msg
            )
          );
        },
        onError: (err) => {
          setIsStreaming(false);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId
                ? {
                    ...msg,
                    content:
                      accumulatedContent ||
                      "I encountered an error connecting to the financial data tools. Please retry.",
                  }
                : msg
            )
          );
        },
      });
    } catch {
      setIsStreaming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 md:w-[440px] bg-[#090b16] border-l border-[#f3ecdc]/15 shadow-2xl flex flex-col justify-between select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#f3ecdc]/10 bg-[#070912] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#ffb454]/15 border border-[#ffb454]/30 flex items-center justify-center text-[#ffb454]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#f3ecdc]">Research Intelligence</span>
              {activeSymbol && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#ffb454]/15 text-[#ffb454] border border-[#ffb454]/30">
                  {activeSymbol}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#6ff2c2]">
              <ShieldCheck className="w-3 h-3" />
              <span>Numbers come from data tools</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#f3ecdc]/50 hover:text-[#f3ecdc] hover:bg-[#f3ecdc]/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs font-sans">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div className="text-[10px] font-mono text-[#f3ecdc]/40 mb-1">
              {msg.role === "user" ? "You" : "Nightfield Agent"} · {msg.timestamp}
            </div>

            <div
              className={`max-w-[92%] rounded-2xl p-4 leading-relaxed font-normal ${
                msg.role === "user"
                  ? "bg-[#181c30] text-[#f3ecdc] border border-[#f3ecdc]/15"
                  : "bg-[#0f1222] text-[#f3ecdc]/90 border border-[#f3ecdc]/10"
              }`}
            >
              <div className="whitespace-pre-line text-[13px]">{msg.content}</div>

              {/* Key Data Cards */}
              {msg.keyData && msg.keyData.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#f3ecdc]/10">
                  {msg.keyData.map((kd, i) => (
                    <div key={i} className="p-2 rounded-lg bg-[#080914] border border-[#f3ecdc]/10 font-mono">
                      <div className="text-[10px] text-[#f3ecdc]/50">{kd.label}</div>
                      <div className="text-xs font-bold text-[#ffb454] mt-0.5 tabular-nums">{kd.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#f3ecdc]/10 font-mono text-[11px]">
                  <div className="text-[#f3ecdc]/40 mb-1.5">Statutory Citations:</div>
                  <div className="space-y-1">
                    {msg.citations.map((c, i) => (
                      <a
                        key={i}
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-[#6ff2c2] hover:underline"
                      >
                        <FileText className="w-3 h-3 shrink-0" />
                        <span className="truncate">{c.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Active Tool Calls during generation */}
        {isStreaming && activeToolCalls.length > 0 && (
          <div className="space-y-2 p-3 rounded-xl bg-[#090c1a] border border-[#ffb454]/25 animate-pulse">
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#ffb454]">
              <Cpu className="w-3.5 h-3.5 animate-spin" />
              <span>Executing Autonomous Data Invocations...</span>
            </div>
            {activeToolCalls.map((tc) => (
              <div
                key={tc.id}
                className="flex items-center justify-between text-[11px] font-mono bg-[#11152a] p-2 rounded-lg border border-[#f3ecdc]/10"
              >
                <span className="text-[#f3ecdc] font-semibold">{tc.tool}</span>
                <span className="text-[#6ff2c2]">{tc.status}</span>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="p-3 border-t border-[#f3ecdc]/10 bg-[#070912] space-y-1.5">
        <div className="text-[10px] font-mono text-[#f3ecdc]/40 uppercase tracking-widest px-1">
          Suggested Queries
        </div>
        <div className="flex flex-col gap-1.5">
          {suggestedPrompts.slice(0, 2).map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              disabled={isStreaming}
              className="text-left px-3 py-1.5 rounded-lg bg-[#101324] hover:bg-[#161a32] border border-[#f3ecdc]/10 text-[11px] font-sans text-[#f3ecdc]/80 hover:text-[#f3ecdc] transition-colors truncate flex items-center justify-between group cursor-pointer"
            >
              <span className="truncate">{prompt}</span>
              <ChevronRight className="w-3 h-3 text-[#ffb454] opacity-0 group-hover:opacity-100 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-3.5 border-t border-[#f3ecdc]/10 bg-[#060810]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            placeholder={
              activeSymbol
                ? `Ask anything about ${activeSymbol}...`
                : "Ask anything about companies or funds..."
            }
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#111428] border border-[#f3ecdc]/15 text-xs text-[#f3ecdc] placeholder:text-[#f3ecdc]/40 focus:outline-none focus:border-[#ffb454]"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="p-2.5 rounded-xl bg-[#f3ecdc] text-[#151510] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 font-bold"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#151510]" />
            ) : (
              <Send className="w-4 h-4 text-[#151510]" />
            )}
          </button>
        </form>
      </div>
    </aside>
  );
};
