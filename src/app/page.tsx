"use client";

import { useState, useRef, useEffect } from "react";
import { Send, UploadCloud, Loader2, Bot, User, Trash2, FileText, Sparkles, Database, LogOut } from "lucide-react";
import dynamic from "next/dynamic";

const ChartBlock = dynamic(() => import("@/components/ChartBlock"), { ssr: false });

type Message = {
  role: "user" | "assistant" | "system" | "error";
  content: string;
};

type SyncedFile = {
  name: string;
  uri: string;
  mimeType: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "สวัสดีครับ! ผมคือผู้ช่วย AI ที่ขับเคลื่อนด้วย  พร้อมใช้งานแล้วครับ! มีเอกสาร  ไฟล์ถูกโหลดไว้ใน Vector Store เรียบร้อยแล้ว สามารถถามคำถามเกี่ยวกับเอกสารได้เลยครับ" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedFiles, setSyncedFiles] = useState<SyncedFile[]>([]);
  // Store the active Vector Store ID
  const [vectorStoreId, setVectorStoreId] = useState<string | null>(null);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncing(true);
    const formData = new FormData();
    formData.append("file", file);
    // If we already have a vector store for this session, append to it
    if (vectorStoreId) {
       formData.append("vectorStoreId", vectorStoreId);
    }

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setSyncedFiles(prev => [...prev, data.file]);
        if (!vectorStoreId && data.vectorStoreId) {
           setVectorStoreId(data.vectorStoreId);
           setMessages(prev => [...prev, { role: "system", content: `🌐 สร้าง Vector Store ใหม่: ${data.vectorStoreId}` }]);
        }
        setMessages(prev => [...prev, { role: "system", content: `✅ บันทึกไฟล์ ${data.file.name} ลง Vector Store สำเร็จ` }]);
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: "error", content: `❌ เกิดข้อผิดพลาดในการอัปโหลด: ${error.message}` }]);
    } finally {
      setIsSyncing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // We are removing this function conceptually because once it's in the Vector Store, 
  // you delete it via a different Google API call. For UI simplicity, we just hide it locally.
  const removeFileLocally = (uri: string) => {
    setSyncedFiles(prev => prev.filter(f => f.uri !== uri));
  };

  const clearVectorStore = () => {
     setVectorStoreId(null);
     setSyncedFiles([]);
     setMessages(prev => [...prev, { role: "system", content: "🗑️ ตัดการเชื่อมต่อจาก Vector Store แล้ว (เปิด Session ใหม่)" }]);
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !vectorStoreId) return;

    const userMessageContent = input.trim() || "ตรวจสอบและสรุปเอกสารใน Data Store";
    
    // Create new message array for UI
    const newUserMessage: Message = { role: "user", content: userMessageContent };
    
    // Filter out system and error messages before sending history to API
    const contextMessages = messages.filter(m => m.role === "user" || m.role === "assistant");
    const newHistory = [...contextMessages, newUserMessage];

    setMessages(prev => [...prev, newUserMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory,
          vectorStoreId: vectorStoreId
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: "error", content: `❌ ข้อผิดพลาด: ${error.message}` }]);
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

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-200 overflow-hidden selection:bg-sky-500/30">
      
      {/* Sidebar - File Upload & Management */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Database className="w-5 h-5 text-sky-400" />
            Vector Store
          </h2>
          <p className="text-xs text-slate-400 mt-2">ข้อมูลจะถูกจัดเก็บแบบถาวรจนกว่าจะถูกลบ สามารถอัปโหลดเพิ่มเติมได้</p>
          
          {/* Pre-configured Vector Store indicator */}
          <div className="mt-4 p-3 bg-emerald-900/20 border border-emerald-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">เชื่อมต่อแล้ว</span>
            </div>
            <p className="text-[11px] text-slate-300">Vector Store พร้อมเอกสาร </p>
            <p className="text-[10px] font-mono text-slate-500 mt-1 truncate" title="fileSearchStores/bulk-import-session-documen-ctvj5zdxa9xv">bulk-import-session-documen-ctvj5zdxa9xv</p>
          </div>
          
          {vectorStoreId && (
            <div className="mt-4 p-3 bg-sky-900/20 border border-sky-500/20 rounded-lg flex items-center justify-between">
              <div className="flex flex-col">
                 <span className="text-[10px] text-sky-400 uppercase font-bold tracking-wider">Active Store ID</span>
                 <span className="text-xs font-mono text-slate-300 truncate w-32" title={vectorStoreId}>{vectorStoreId.replace('corpora/', '')}</span>
              </div>
              <button onClick={clearVectorStore} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-red-400 transition" title="Start New Session">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="p-6 flex-1 overflow-y-auto scrollbar-custom">


          {/* Uploaded Files List */}
          {syncedFiles.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Files in Context</h3>
              <div className="space-y-3">
                {syncedFiles.map((file, idx) => (
                  <div key={idx} className="glass-panel p-3 rounded-lg flex items-center gap-3 group relative overflow-hidden transition-all hover:bg-slate-800/80">
                    <div className="p-2 bg-slate-800 rounded-md">
                      <FileText className="w-4 h-4 text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-500">Indexed via Gemini</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
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

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 to-transparent">
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-custom">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                
                {/* Avatar */}
                {(msg.role === "assistant" || msg.role === "user") && (
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg
                    ${msg.role === "assistant" ? "bg-gradient-to-tr from-sky-500 to-indigo-500 text-white" : "bg-slate-700 text-slate-300"}
                  `}>
                    {msg.role === "assistant" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm
                  ${msg.role === "user" ? "bg-sky-600 text-white rounded-tr-sm" : 
                    msg.role === "assistant" ? "glass-panel text-slate-100 rounded-tl-sm prose prose-invert" : 
                    msg.role === "system" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm self-center mx-auto" :
                    "bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm self-center mx-auto"}
                `}>
                  {(() => {
                    // Detect %%%CHART {...} %%% blocks in assistant messages
                    const chartRegex = /%%%CHART\s*([\s\S]*?)\s*%%%/g;
                    const parts = [];
                    let lastIdx = 0;
                    let match;
                    const content = msg.content;

                    if (msg.role === "assistant") {
                      while ((match = chartRegex.exec(content)) !== null) {
                        // Text before the chart
                        if (match.index > lastIdx) {
                          const textBefore = content.slice(lastIdx, match.index);
                          parts.push(
                            <div key={`text-${lastIdx}`}>
                              {textBefore.split('\n').map((line: string, i: number) => (
                                <p key={i} className="whitespace-pre-wrap">{line}</p>
                              ))}
                            </div>
                          );
                        }
                        // Chart block
                        try {
                          const chartData = JSON.parse(match[1].trim());
                          parts.push(<ChartBlock key={`chart-${match.index}`} data={chartData} />);
                        } catch {
                          parts.push(<p key={`err-${match.index}`} className="text-red-400 text-xs">⚠️ ไม่สามารถแสดงกราฟได้</p>);
                        }
                        lastIdx = match.index + match[0].length;
                      }
                    }

                    // Remaining text or non-assistant message
                    if (parts.length > 0 && lastIdx < content.length) {
                      const remaining = content.slice(lastIdx);
                      parts.push(
                        <div key={`text-${lastIdx}`}>
                          {remaining.split('\n').map((line: string, i: number) => (
                            <p key={i} className="whitespace-pre-wrap">{line}</p>
                          ))}
                        </div>
                      );
                    }

                    if (parts.length > 0) return <>{parts}</>;

                    // Default: plain text rendering
                    return content.split('\n').map((line: string, i: number) => (
                      <p key={i} className="whitespace-pre-wrap">{line}</p>
                    ));
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
                  <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-6 pb-8 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/95 to-transparent">
          <div className="max-w-3xl mx-auto relative">
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
                disabled={isLoading || (!input.trim() && !vectorStoreId)}
                className="absolute right-2 bottom-2 p-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="text-center mt-3">
              <p className="text-[10px] text-slate-500">
                y.
              </p>
            </div>
          </div>
        </div>
      </main>
      
    </div>
  );
}
