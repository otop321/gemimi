"use client";

import { useState } from "react";
import { Plus, MessageSquare, Pencil, Trash2, Check, X } from "lucide-react";
import type { ChatSession } from "@/types/chat";

type Props = {
  sessions: ChatSession[];
  activeId: string | null;
  onNew: () => void;
  onSwitch: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export default function ConversationList({
  sessions,
  activeId,
  onNew,
  onSwitch,
  onRename,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (s: ChatSession) => {
    setEditingId(s.id);
    setEditValue(s.title);
  };

  const commitEdit = () => {
    if (editingId) onRename(editingId, editValue);
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-sky-700/20 active:scale-95"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          แชทใหม่
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 scrollbar-custom">
        {sessions.length === 0 && (
          <p className="text-xs text-slate-500 text-center mt-6">ยังไม่มีประวัติการสนทนา</p>
        )}

        {sessions.map((s) => {
          const isActive = s.id === activeId;
          const isEditing = s.id === editingId;

          return (
            <div
              key={s.id}
              onClick={() => !isEditing && onSwitch(s.id)}
              className={`group relative flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all
                ${isActive
                  ? "bg-slate-700/70 text-white"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
            >
              <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-sky-400" />

              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-slate-900 border border-sky-500 rounded px-2 py-0.5 text-sm text-white outline-none"
                  />
                ) : (
                  <p className="text-sm truncate leading-snug">{s.title}</p>
                )}
                <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(s.createdAt)}</p>
              </div>

              {/* Action buttons (visible on hover / active) */}
              {!isEditing && (
                <div
                  className={`flex items-center gap-1 flex-shrink-0 transition-opacity
                    ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => startEdit(s)}
                    title="เปลี่ยนชื่อ"
                    className="p-1 hover:text-sky-400 rounded"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(s.id)}
                    title="ลบ"
                    className="p-1 hover:text-red-400 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Confirm / Cancel edit */}
              {isEditing && (
                <div
                  className="flex items-center gap-1 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={commitEdit} className="p-1 hover:text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 hover:text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
