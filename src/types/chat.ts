export type MessageRole = "user" | "assistant" | "system" | "error";

export type Message = {
  role: MessageRole;
  content: string;
};

export type SyncedFile = {
  name: string;
  uri: string;
  mimeType: string;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  vectorStoreId: string | null;
  syncedFiles: SyncedFile[];
  createdAt: number;
};
