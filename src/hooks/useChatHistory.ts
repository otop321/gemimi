"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChatSession, Message, SyncedFile } from "@/types/chat";

const STORAGE_KEY = "gemimi_chat_sessions";
const ACTIVE_SESSION_KEY = "gemimi_active_session_id";

const DEFAULT_GREETING: Message = {
  role: "assistant",
  content:
    "สวัสดีครับ! ผมคือผู้ช่วย AI ที่ขับเคลื่อนด้วย Gemini พร้อมใช้งานแล้วครับ! มีเอกสารถูกโหลดไว้ใน Vector Store เรียบร้อยแล้ว สามารถถามคำถามเกี่ยวกับเอกสารได้เลยครับ",
};

function generateId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createSession(): ChatSession {
  return {
    id: generateId(),
    title: "แชทใหม่",
    messages: [DEFAULT_GREETING],
    vectorStoreId: null,
    syncedFiles: [],
    createdAt: Date.now(),
  };
}

function loadFromStorage(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Guard against corrupted data (non-array)
    return Array.isArray(parsed) ? (parsed as ChatSession[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    const storedActiveId = localStorage.getItem(ACTIVE_SESSION_KEY);

    if (stored.length === 0) {
      const initial = createSession();
      setSessions([initial]);
      setActiveId(initial.id);
      saveToStorage([initial]);
      localStorage.setItem(ACTIVE_SESSION_KEY, initial.id);
    } else {
      setSessions(stored);
      const valid = stored.find((s) => s.id === storedActiveId);
      setActiveId(valid ? valid.id : stored[0].id);
    }
    setIsReady(true);
  }, []);

  const persist = useCallback((next: ChatSession[]) => {
    setSessions(next);
    saveToStorage(next);
  }, []);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const createNewSession = useCallback(() => {
    const s = createSession();
    setSessions((prev) => {
      const next = [s, ...prev];
      saveToStorage(next);
      return next;
    });
    setActiveId(s.id);
    localStorage.setItem(ACTIVE_SESSION_KEY, s.id);
    return s;
  }, []);

  const switchSession = useCallback((id: string) => {
    setActiveId(id);
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  }, []);

  const updateSession = useCallback(
    (id: string, updates: Partial<Omit<ChatSession, "id" | "createdAt">>) => {
      setSessions((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
        saveToStorage(next);
        return next;
      });
    },
    []
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (next.length === 0) {
          const fresh = createSession();
          saveToStorage([fresh]);
          setActiveId(fresh.id);
          localStorage.setItem(ACTIVE_SESSION_KEY, fresh.id);
          return [fresh];
        }
        saveToStorage(next);
        if (id === activeId) {
          setActiveId(next[0].id);
          localStorage.setItem(ACTIVE_SESSION_KEY, next[0].id);
        }
        return next;
      });
    },
    [activeId]
  );

  const renameSession = useCallback(
    (id: string, newTitle: string) => {
      updateSession(id, { title: newTitle.trim() || "แชทใหม่" });
    },
    [updateSession]
  );

  const addMessage = useCallback(
    (msg: Message) => {
      if (!activeId) return;
      setSessions((prev) => {
        const next = prev.map((s) => {
          if (s.id !== activeId) return s;
          const newMessages = [...s.messages, msg];
          // Auto-title from first user message
          const title =
            s.title === "แชทใหม่" && msg.role === "user"
              ? msg.content.slice(0, 40)
              : s.title;
          return { ...s, messages: newMessages, title };
        });
        saveToStorage(next);
        return next;
      });
    },
    [activeId]
  );

  return {
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
  };
}
