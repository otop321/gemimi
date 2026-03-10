"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Trash2,
  FileText,
  Database,
  LogOut,
  UploadCloud,
  Loader2,
  Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useChatHistory } from "@/hooks/useChatHistory";
import ConversationList from "@/components/ConversationList";
import type { Message, SyncedFile } from "@/types/chat";

const ChartBlock = dynamic(() => import("@/components/ChartBlock"), { ssr: false });

export default function Home() {
  const {
    sessions,
    activeSession,
    activeId,
    isReady,
    createNewSession,
    switchSession,
    updateSession,
    deleteSession,
    renameSession,
    addMessage,
  } = useChatHistory();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const messages = activeSession?.messages ?? [];
  const vectorStoreId = activeSession?.vectorStoreId ?? null;

  // Auto-scroll
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearVectorStore = () => {
    if (!activeId) return;
    updateSession(activeId, { vectorStoreId: null, syncedFiles: [] });
    addMessage({ role: "system", content: "🗑️ ตัดการเชื่อมต่อจาก Vector Store แล้ว (เปิด Session ใหม่)" });
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !activeId) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const contextMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");
    const newHistory = [...contextMessages, userMsg];

    addMessage(userMsg);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory, vectorStoreId }),
      });
      const data = await res.json();

      if (res.ok) {
        addMessage({ role: "assistant", content: data.content });
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (err: any) {
      addMessage({ role: "error", content: `❌ ข้อผิดพลาด: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f172a]">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-200 overflow-hidden selection:bg-sky-500/30">

      {/* ── LEFT SIDEBAR: Conversation History ── */}
      <aside className="w-72 border-r border-slate-800 bg-slate-900/60 flex flex-col">
        {/* App Logo */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm">แชทบอทธุรกิจ</span>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-hidden">
          <ConversationList
            sessions={sessions}
            activeId={activeId}
            onNew={createNewSession}
            onSwitch={switchSession}
            onRename={renameSession}
            onDelete={deleteSession}
          />
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ── MAIN CHAT ── */}
      <div className="flex-1 flex">
        {/* Chat area */}
        <main className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 to-transparent">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-custom">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {(msg.role === "assistant" || msg.role === "user") && (
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg
                      ${msg.role === "assistant" ? "bg-gradient-to-tr from-sky-500 to-indigo-500 text-white" : "bg-slate-700 text-slate-300"}`}>
                      {msg.role === "assistant" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                  )}

                  <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm
                    ${msg.role === "user" ? "bg-sky-600 text-white rounded-tr-sm" :
                      msg.role === "assistant" ? "glass-panel text-slate-100 rounded-tl-sm prose prose-invert" :
                      msg.role === "system" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm self-center mx-auto" :
                      "bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm self-center mx-auto"}`}>
                    {(() => {
                      const chartRegex = /%%%CHART\s*([\s\S]*?)\s*%%%/g;
                      const parts: React.ReactNode[] = [];
                      let lastIdx = 0;
                      let match;
                      const content = msg.content;

                      if (msg.role === "assistant") {
                        while ((match = chartRegex.exec(content)) !== null) {
                          if (match.index > lastIdx) {
                            const textBefore = content.slice(lastIdx, match.index);
                            parts.push(
                              <div key={`text-${lastIdx}`}>
                                {textBefore.split("\n").map((line, i) => <p key={i} className="whitespace-pre-wrap">{line}</p>)}
                              </div>
                            );
                          }
                          try {
                            // 1. Strip code fences if present
                            let raw = match[1].trim()
                              .replace(/^```(?:json)?\s*/i, "")
                              .replace(/\s*```$/, "")
                              .trim();
                            // 2. Extract just the JSON object/array in case there's extra text
                            const jsonStart = raw.indexOf("{");
                            const jsonEnd = raw.lastIndexOf("}");
                            if (jsonStart !== -1 && jsonEnd !== -1) {
                              raw = raw.slice(jsonStart, jsonEnd + 1);
                            }
                            const chartData = JSON.parse(raw);
                            parts.push(<ChartBlock key={`chart-${match.index}`} data={chartData} />);
                          } catch {
                            // Do NOT console.error here. Next.js intercepts console.error during 
                            // the render phase and triggers a fatal error overlay.
                            parts.push(<p key={`err-${match.index}`} className="text-red-400 text-xs text-center py-2">⚠️ ไม่สามารถดึงกราฟจากข้อมูลในเอกสารได้</p>);
                          }
                          lastIdx = match.index + match[0].length;
                        }
                      }

                      if (parts.length > 0 && lastIdx < content.length) {
                        const remaining = content.slice(lastIdx);
                        parts.push(
                          <div key={`text-${lastIdx}`}>
                            {remaining.split("\n").map((line, i) => <p key={i} className="whitespace-pre-wrap">{line}</p>)}
                          </div>
                        );
                      }
                      if (parts.length > 0) return <>{parts}</>;
                      return content.split("\n").map((line, i) => <p key={i} className="whitespace-pre-wrap">{line}</p>);
                    })()}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4 flex-row">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-tr from-sky-500 to-indigo-500 text-white shadow-lg">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl px-5 py-4 glass-panel text-slate-100 rounded-tl-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-4 sm:p-6 pb-8 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/95 to-transparent">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSendMessage} className="relative flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="พิมพ์ข้อความตอบโต้ที่นี่... (Shift + Enter เพื่อขึ้นบรรทัดใหม่)"
                  className="w-full glass-input rounded-2xl pl-5 pr-14 py-4 text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none min-h-[60px] max-h-[200px] scrollbar-custom text-sm"
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 bottom-2 p-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </main>

        {/* ── RIGHT PANEL: Vector Store ── */}
        <aside className="w-72 border-l border-slate-800 bg-slate-900/40 flex flex-col">
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-sm font-bold flex items-center gap-2 text-white">
              <Database className="w-4 h-4 text-sky-400" />
              Vector Store
            </h2>
            <p className="text-xs text-slate-400 mt-1">อัปโหลดเอกสารเพื่อเพิ่มความรู้ให้บอท</p>

            {/* Pre-configured store indicator */}
            <div className="mt-3 p-3 bg-emerald-900/20 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">เชื่อมต่อแล้ว</span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 truncate">bulk-import-session-documen-ctvj5zdxa9xv</p>
            </div>

            {vectorStoreId && (
              <div className="mt-3 p-3 bg-sky-900/20 border border-sky-500/20 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-sky-400 uppercase font-bold tracking-wider">Active Store</span>
                  <p className="text-xs font-mono text-slate-300 truncate w-36" title={vectorStoreId}>{vectorStoreId.replace("corpora/", "")}</p>
                </div>
                <button onClick={clearVectorStore} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-red-400 transition" title="ล้าง Store">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>


        </aside>
      </div>
    </div>
  );
}
