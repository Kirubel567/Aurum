import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/src/lib/supabase/server";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

const DAILY_MESSAGE_LIMIT = 200;

// Connection-failure fallback. Never stored in the DB and always filtered out
// of the AI context — storing these poisons the conversation history and
// trains the model to return empty replies.
const FALLBACK_PREFIX = "I'm having trouble connecting right now.";
const FALLBACK_MESSAGE =
  "I'm having trouble connecting right now. Please try again in a moment, or contact your account manager directly via the Concierge section.";

const SYSTEM_PROMPT = `You are Aurum Core AI, a professional 24/7 financial assistant for Aurum Sovereign Capital, an institutional investment management firm.

Your role is to assist investors with clear, concise, and professional responses about:
- Deposit status and verification (CBE bank transfers and wire transfers typically process in 1–3 business hours)
- Withdrawals: this feature is currently being finalised and is temporarily unavailable to investors — if asked, say withdrawals are coming soon and funds remain fully secure in the meantime
- Portfolio performance and trade activity
- How capital is managed: each investor's capital is managed individually, not pooled or commingled with other investors. Trades are taken by the trading desk and classified into three categories for reporting purposes:
  • Forex Majors — major currency pairs
  • Commodities — precious metals and other commodities
  • Global Indices — global index exposure
  The dashboard's category breakdown shows what % of trades taken fall into each category — it is not a capital allocation or a promised return, and there are no fixed return percentages to quote. Never state a specific expected return rate.
- Legal documents and contracts (available in the My Contract section)
- General account management and platform navigation

Guidelines you must follow:
- Be professional, precise, and concise — never verbose
- For real-time account-specific data (exact balance, live transaction status), acknowledge your limitation and direct the investor to their dashboard or their dedicated account manager via the Concierge section
- For urgent or complex matters, recommend contacting the account manager directly
- Never fabricate specific transaction IDs, exact account balances, specific dates, or return percentages you don't know
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

  // Exclude stored connection-failure fallbacks from the AI context — a
  // history full of "question → error apology" pairs teaches the model to
  // return empty replies (verified: 100% empty candidates on such sessions).
  const historyChronological = (history ?? [])
    .reverse()
    .filter((m) => !(m.role === "assistant" && m.body.startsWith(FALLBACK_PREFIX)));

  // Gemini rejects contents that start with a 'model' turn — if the 20-message
  // window begins mid-conversation on an assistant reply, drop it.
  while (historyChronological.length > 0 && historyChronological[0].role === "assistant") {
    historyChronological.shift();
  }

  // ── Call Gemini via direct fetch (bypasses SDK version/model limitations) ─────
  let replyText: string;

  // Build contents array: system prompt prepended to first user message,
  // then full conversation history in alternating user/model turns.
  const contents = historyChronological.map((m, i) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: i === 0 ? `${SYSTEM_PROMPT}\n\n${m.body}` : m.body }],
  }));

  // Try models in order until one succeeds. 2.5 models first — verified
  // working with this key's quota; the 2.0 family returns 429 (limit: 0).
  const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];

  // Two configs per model: no-thinking first (fast), then default thinking as
  // a retry — 2.5 models occasionally return an empty candidate with
  // thinkingBudget: 0, and the default config recovers those cases.
  const GEN_CONFIGS = [
    { temperature: 0.7, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
    { temperature: 0.7, maxOutputTokens: 2048 },
  ];

  replyText = "";
  outer: for (const modelName of MODELS) {
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    for (const generationConfig of GEN_CONFIGS) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents, generationConfig }),
        });

        if (res.status === 404 || res.status === 429) {
          // 404 = model not available, 429 = quota hit — skip to next model
          if (res.status === 429) {
            const errBody = await res.text();
            console.warn(`[support/message] ${modelName} quota exceeded, trying next model. ${errBody.slice(0, 120)}`);
          }
          continue outer;
        }

        if (!res.ok) {
          const errBody = await res.text();
          console.error(`[support/message] Gemini ${modelName} error ${res.status}:`, errBody);
          continue outer;
        }

        const data = await res.json() as {
          candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
        };
        // Join every text part — replies aren't always in parts[0].
        replyText = (data.candidates?.[0]?.content?.parts ?? [])
          .map((p) => p.text ?? "")
          .join("")
          .trim();
        if (replyText) break outer; // success
        console.warn(
          `[support/message] ${modelName} returned no text (finishReason: ${data.candidates?.[0]?.finishReason ?? "unknown"}) — retrying with default thinking`
        );
      } catch (err) {
        console.error(`[support/message] Gemini ${modelName} fetch error:`, err);
        continue outer;
      }
    }
  }

  // ── No reply from any model: return an EPHEMERAL fallback ─────────────────────
  // Deliberately NOT stored — saving failure apologies into the session history
  // poisons the AI context for every later message.
  if (!replyText) {
    return NextResponse.json({
      sessionId: resolvedSessionId,
      reply: {
        id: `ephemeral-${Date.now()}`,
        role: "assistant",
        body: FALLBACK_MESSAGE,
        created_at: new Date().toISOString(),
      },
    });
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
