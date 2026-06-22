import { simulateRequest } from "./client";
import type {
  ChatMessage,
  ChatSession,
  ChatThread,
  InboxChannel,
} from "@/src/types/chat.types";

const MOCK_SESSION: ChatSession = {
  id: "ses_001",
  userId: "usr_inv_001",
  status: "active",
  escalatedToHuman: false,
  createdAt: "2025-03-20T10:00:00Z",
};

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "msg_001",
    sessionId: "ses_001",
    sender: "ai",
    content: "Welcome to Aurum Support. How can I assist you today?",
    timestamp: "2025-03-20T10:00:00Z",
    read: true,
  },
  {
    id: "msg_002",
    sessionId: "ses_001",
    sender: "user",
    content: "I'd like to check the status of my recent deposit.",
    timestamp: "2025-03-20T10:01:30Z",
    read: true,
  },
  {
    id: "msg_003",
    sessionId: "ses_001",
    sender: "ai",
    content:
      "I can see a pending deposit of $100,000 submitted on March 18th. It's currently under verification. Typical processing time is 1-3 business days.",
    timestamp: "2025-03-20T10:01:45Z",
    read: true,
  },
  {
    id: "msg_004",
    sessionId: "ses_001",
    sender: "user",
    content: "Can I get an estimated completion time?",
    timestamp: "2025-03-20T10:02:30Z",
    read: true,
  },
  {
    id: "msg_005",
    sessionId: "ses_001",
    sender: "ai",
    content:
      "Based on current queue volume, your deposit should be verified by end of business tomorrow. Would you like me to escalate to a human agent?",
    timestamp: "2025-03-20T10:02:50Z",
    read: false,
  },
];

const MOCK_CHANNELS: InboxChannel[] = [
  {
    id: "ch_001",
    userId: "usr_001",
    userName: "Alexander Mercer",
    lastMessage: "Can I get an estimated completion time?",
    lastMessageAt: "2025-03-20T10:02:30Z",
    unreadCount: 2,
    status: "open",
  },
  {
    id: "ch_002",
    userId: "usr_002",
    userName: "Victoria Ashford",
    lastMessage: "I need help with my withdrawal request.",
    lastMessageAt: "2025-03-20T09:45:00Z",
    unreadCount: 1,
    status: "escalated",
  },
  {
    id: "ch_003",
    userId: "usr_005",
    userName: "Marcus Reid",
    lastMessage: "Thank you for the quick resolution.",
    lastMessageAt: "2025-03-19T16:30:00Z",
    unreadCount: 0,
    status: "resolved",
  },
  {
    id: "ch_004",
    userId: "usr_007",
    userName: "Robert Kane",
    lastMessage: "What are the current BTC position limits?",
    lastMessageAt: "2025-03-19T14:00:00Z",
    unreadCount: 1,
    status: "open",
  },
  {
    id: "ch_005",
    userId: "usr_009",
    userName: "Thomas Berg",
    lastMessage: "Please update my contact information.",
    lastMessageAt: "2025-03-18T11:20:00Z",
    unreadCount: 0,
    status: "open",
  },
  {
    id: "ch_006",
    userId: "usr_011",
    userName: "Oliver Grant",
    lastMessage: "Escalated — awaiting manager callback.",
    lastMessageAt: "2025-03-17T15:00:00Z",
    unreadCount: 3,
    status: "escalated",
  },
];

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const messages = MOCK_MESSAGES.filter((m) => m.sessionId === sessionId);
  return simulateRequest(messages, 250);
}

export async function sendMessage(
  sessionId: string,
  content: string
): Promise<ChatMessage> {
  const message: ChatMessage = {
    id: `msg_${Date.now()}`,
    sessionId,
    sender: "user",
    content,
    timestamp: new Date().toISOString(),
    read: true,
  };
  return simulateRequest(message, 300);
}

export async function escalateToHuman(
  sessionId: string
): Promise<ChatSession> {
  const session: ChatSession = {
    ...MOCK_SESSION,
    id: sessionId,
    status: "escalated",
    escalatedToHuman: true,
  };
  return simulateRequest(session, 400);
}

export async function getInboxChannels(): Promise<InboxChannel[]> {
  return simulateRequest([...MOCK_CHANNELS], 280);
}

export async function getThread(channelId: string): Promise<ChatThread> {
  const channel = MOCK_CHANNELS.find((c) => c.id === channelId);
  const thread: ChatThread = {
    channelId,
    messages: [...MOCK_MESSAGES],
    participantName: channel?.userName ?? "Unknown User",
  };
  return simulateRequest(thread, 300);
}
