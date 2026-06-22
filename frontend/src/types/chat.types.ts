export type MessageSender = "user" | "ai" | "agent" | "system";

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: MessageSender;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  status: "active" | "escalated" | "closed";
  escalatedToHuman: boolean;
  createdAt: string;
}

export interface InboxChannel {
  id: string;
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: "open" | "escalated" | "resolved";
}

export interface ChatThread {
  channelId: string;
  messages: ChatMessage[];
  participantName: string;
}
