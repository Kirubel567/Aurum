import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServerClient } from "@/src/lib/supabase/server";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

const DAILY_MESSAGE_LIMIT = 200;

const SYSTEM_PROMPT = `You are Aurum Core AI, a professional 24/7 financial assistant for Aurum Sovereign Capital, an institutional investment management firm.

Your role is to assist investors with clear, concise, and professional responses about:
- Deposit status and verification (CBE bank transfers and wire transfers typically process in 1–3 business hours)
- Withdrawal requests (processed within 24–48 business hours; a minimum 30-day lock-up period applies)
- Portfolio performance and yield reporting
- Strategy pool details:
  • Apex Gold Pool — avg. 12.4% annual return, highest allocation
  • Silver Shield Pool — avg. 9.1% annual return
  • Obsidian Core Pool — avg. 7.8% annual return, most conservative
  • Pool rebalancing occurs quarterly
- Legal documents and contracts (available in the My Contract section)
- General account management and platform navigation

Guidelines you must follow:
- Be professional, precise, and concise — never verbose
- For real-time account-specific data (exact balance, live transaction status), acknowledge your limitation and direct the investor to their dashboard or their dedicated account manager via the Concierge section
- For urgent or complex matters, recommend contacting the account manager directly
- Never fabricate specific transaction IDs, exact account balances, or specific dates you don't know
- Always end with a clear next step or offer to help further
- All responses are informational only and do not constitute financial advice
- Keep responses under 150 words unless the question genuinely requires more detail`;

// POST /api/support/message
// Body: { sessionId: string; message: string }
export async function POST(req: NextRequest) {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "investor") {
    return NextResponse.json({ error: "Investors only" }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const { sessionId, message } = await req.json() as {
    sessionId?: string;
    message?: string;
  };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // ── Enforce daily message limit ───────────────────────────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("ai_chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", todayStart.toISOString())
    .in(
      "session_id",
      (
        await supabase
          .from("ai_chat_sessions")
          .select("id")
          .eq("user_id", session.user.id)
      ).data?.map((s: { id: string }) => s.id) ?? []
    );

  if ((count ?? 0) >= DAILY_MESSAGE_LIMIT) {
    return NextResponse.json(
      { error: "Daily message limit reached. Please try again tomorrow." },
      { status: 429 }
    );
  }

  // ── Resolve or create session ─────────────────────────────────────────────────
  let resolvedSessionId = sessionId;

  if (!resolvedSessionId) {
    const { data: newSession, error: sessionError } = await supabase
      .from("ai_chat_sessions")
      .insert({ user_id: session.user.id })
      .select("id")
      .single();
    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });
    resolvedSessionId = newSession.id;
  } else {
    // Verify ownership
    const { data: existing } = await supabase
      .from("ai_chat_sessions")
      .select("user_id")
      .eq("id", resolvedSessionId)
      .maybeSingle();
    if (!existing || existing.user_id !== session.user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
  }

  // ── Insert user message ───────────────────────────────────────────────────────
  const { error: insertUserError } = await supabase
    .from("ai_chat_messages")
    .insert({ session_id: resolvedSessionId, role: "user", body: message.trim() });

  if (insertUserError) {
    return NextResponse.json({ error: insertUserError.message }, { status: 500 });
  }

  // ── Load conversation history for context (last 20 messages) ─────────────────
  const { data: history } = await supabase
    .from("ai_chat_messages")
    .select("role, body")
    .eq("session_id", resolvedSessionId)
    .order("created_at", { ascending: false })
    .limit(20);

  const historyChronological = (history ?? []).reverse();

  // ── Call Gemini ───────────────────────────────────────────────────────────────
  let replyText: string;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Build Gemini chat history (all messages except the last user one, which is the current turn)
    const chatHistory = historyChronological.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.body }],
    }));

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await chat.sendMessage(message.trim());
    replyText = result.response.text().trim();
  } catch (err) {
    console.error("[support/message] Gemini error:", err);
    replyText =
      "I'm having trouble connecting right now. Please try again in a moment, or contact your account manager directly via the Concierge section.";
  }

  // ── Insert assistant reply ────────────────────────────────────────────────────
  const { data: replyRow, error: insertReplyError } = await supabase
    .from("ai_chat_messages")
    .insert({ session_id: resolvedSessionId, role: "assistant", body: replyText })
    .select("id, created_at")
    .single();

  if (insertReplyError) {
    return NextResponse.json({ error: insertReplyError.message }, { status: 500 });
  }

  return NextResponse.json({
    sessionId: resolvedSessionId,
    reply: {
      id: replyRow.id,
      role: "assistant",
      body: replyText,
      created_at: replyRow.created_at,
    },
  });
}
