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
  TrendingUp,
  ShoppingBag,
  Factory,
  Wheat,
  Palmtree,
  Users,
  Zap,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useChatHistory } from "@/hooks/useChatHistory";
import ConversationList from "@/components/ConversationList";
import type { Message, SyncedFile } from "@/types/chat";

const ChartBlock = dynamic(() => import("@/components/ChartBlock"), { ssr: false });

const categories = [
  { 
    title: "เศรษฐกิจมหภาคและระดับจังหวัด", 
    icon: TrendingUp, 
    color: "text-blue-400",
    prompt: "ช่วยสรุปแนวโน้ม GPP per capita ของจังหวัดในภาคตะวันออกในช่วง 5 ปีล่าสุดให้หน่อย"
  },
  { 
    title: "ผลิตภัณฑ์ชุมชนและ OTOP", 
    icon: ShoppingBag, 
    color: "text-orange-400",
    prompt: "ปี 2567 สินค้า OTOP ประเภทใดมียอดจำหน่ายสูงสุด และจังหวัดใดเป็นผู้นำ?"
  },
  { 
    title: "อุตสาหกรรมและการผลิต", 
    icon: Factory, 
    color: "text-slate-400",
    prompt: "ขอมูลโรงงานอุตสาหกรรมในพื้นที่ EEC จำพวกที่ 3 มีกี่แห่ง และส่วนใหญ่เป็นธุรกิจประเภทไหน?"
  },
  { 
    title: "เกษตรกรรมและพืชเศรษฐกิจ", 
    icon: Wheat, 
    color: "text-emerald-400",
    prompt: "เปรียบเทียบต้นทุนการผลิตข้าวนาปรังและปริมาณผลผลิตข้าวในภาคเหนือปีล่าสุด"
  },
  { 
    title: "การท่องเที่ยว บริการ และมาตรฐาน", 
    icon: Palmtree, 
    color: "text-sky-400",
    prompt: "จังหวัดลำปางมีโรงแรมที่ได้รับมาตรฐาน SHA กี่แห่ง และนักท่องเที่ยวส่วนใหญ่ทำรายได้ให้จังหวัดเท่าไหร่?"
  },
  { 
    title: "แรงงานและการประกอบกิจการ", 
    icon: Users, 
    color: "text-indigo-400",
    prompt: "จำนวนคนทำงานในสถานประกอบการอุตสาหกรรมการผลิตแยกตามขนาดกิจการเป็นอย่างไร?"
  },
  { 
    title: "พลังงานและสิ่งแวดล้อม", 
    icon: Zap, 
    color: "text-yellow-400",
    prompt: "ราคาขายส่งน้ำมันสำเร็จรูป ณ โรงกลั่น มีแนวโน้มอย่างไร และกระทบต่อการใช้น้ำมันดิบไหม?"
  },
  { 
    title: "การเงิน หนี้สิน และเทคโนโลยี", 
    icon: Wallet, 
    color: "text-purple-400",
    prompt: "วิเคราะห์สัดส่วนหนี้สินครัวเรือนและอัตราส่วนหนี้ค้างชำระของเกษตรกรในช่วงปีที่ผ่านมา"
  },
  { 
    title: "นโยบายรัฐและความเชื่อมั่น", 
    icon: ShieldCheck, 
    color: "text-rose-400",
    prompt: "สรุปแผนและผลการกู้เงินของรัฐบาลในปี 2566 และระดับความเชื่อมั่นของประชาชนต่อเศรษฐกิจ"
  },
];

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = activeSession?.messages ?? [];
  const vectorStoreId = activeSession?.vectorStoreId ?? null;

  // Auto-focus input on prompt click
  const handleCategoryClick = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => {
      textareaRef.current?.focus();
      // Adjust height if auto-expanding is implemented
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, 10);
  };

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
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center p-0.5">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain rounded-md" />
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
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg overflow-hidden
                      ${msg.role === "assistant" ? "bg-slate-800 p-1" : "bg-slate-700 text-slate-300"}`}>
                      {msg.role === "assistant" ? (
                        <img src="/logo.png" alt="AI" className="w-7 h-7 object-contain" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
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
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="พิมพ์ข้อความตอบโต้ที่นี่... (Shift + Enter เพื่อขึ้นบรรทัดใหม่)"
                  className="w-full glass-input rounded-2xl pl-5 pr-14 py-4 text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none min-h-[60px] max-h-[200px] scrollbar-custom text-sm overflow-hidden"
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
              ฐานข้อมูล vector ทางธุรกิจ
            </h2>
            <p className="text-xs text-slate-400 mt-1">ประเภทข้อมูลที่สนับสนุน csv,xlsx,docx </p>

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

          {/* Data Categories List */}
          <div className="flex-1 overflow-y-auto px-5 py-6 scrollbar-custom">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              หมวดหมู่ข้อมูลในระบบ
            </h3>
            <div className="space-y-1">
              {categories.map((cat, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleCategoryClick(cat.prompt)}
                  className="w-full group text-left flex flex-col gap-1 p-2.5 rounded-xl hover:bg-white/[0.03] transition-all duration-300 border border-transparent hover:border-white/[0.05]"
                  title={cat.prompt}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-slate-800/50 group-hover:scale-110 transition-transform duration-300 ${cat.color}`}>
                      <cat.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors duration-300 leading-tight">
                      {cat.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1 pl-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 italic">
                    {cat.prompt}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-sky-500/5 to-indigo-500/5 border border-sky-500/10">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                ระบบถูกออกแบบมาเพื่อวิเคราะห์ข้อมูลธุรกิจโดยเฉพาะ อ้างอิงจากชุดข้อมูลจริงกว่า 800 ไฟล์ในฐานข้อมูล
              </p>
            </div>
          </div>


        </aside>
      </div>
    </div>
  );
}
