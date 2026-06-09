import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_DAILY_LIMIT = 5;

const SYSTEM_PROMPT = `You are Ace, an expert SAT tutor built into ClutchSAT. You help students prepare for the SAT.

Your personality:
- Friendly, encouraging, and concise
- You explain concepts clearly, using examples when helpful
- You celebrate correct answers and gently correct mistakes
- You keep responses focused and under 300 words unless a detailed explanation is needed

Your capabilities:
- Explain SAT math concepts (algebra, geometry, statistics, advanced math)
- Explain SAT reading & writing concepts (grammar, rhetoric, comprehension)
- Help break down passages and questions
- Provide tips and strategies for the digital SAT
- When given a specific question with context, help explain the answer

Rules:
- Never give answers directly if the student hasn't tried yet — guide them
- If asked about non-SAT topics, politely redirect: "I'm Ace, your SAT tutor! I'm best at helping with SAT prep. What SAT topic can I help with?"
- Use LaTeX notation with single $ delimiters for inline math when appropriate (e.g. $x^2 + 3x + 2$). Do NOT wrap your entire response in $ signs.
- Be encouraging — studying for the SAT is stressful!
- IMPORTANT: Use line breaks between paragraphs and sections to make your responses easy to read. Use bullet points or numbered lists when explaining multiple concepts or steps.
- Keep your formatting clean and scannable — avoid walls of text.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, questionContext } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check auth & rate limit
    const authHeader = req.headers.get("Authorization");
    let isPremium = false;
    let userId: string | null = null;
    let remainingMessages: number | null = null;

    if (authHeader) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);

      if (userData?.user) {
        userId = userData.user.id;

        // Check premium status
        const { data: profile } = await supabase
          .from("profiles")
          .select("premium_until")
          .eq("user_id", userId)
          .single();

        if (profile?.premium_until) {
          const premiumUntil = new Date(profile.premium_until);
          isPremium = premiumUntil > new Date();
        }

        // Check daily usage for free users
        if (!isPremium) {
          const today = new Date().toISOString().split("T")[0];
          const { data: usage } = await supabase
            .from("ace_messages")
            .select("message_count")
            .eq("user_id", userId)
            .eq("message_date", today)
            .single();

          const currentCount = usage?.message_count ?? 0;

          if (currentCount >= FREE_DAILY_LIMIT) {
            return new Response(
              JSON.stringify({
                error: "daily_limit_reached",
                message: `You've used all ${FREE_DAILY_LIMIT} free messages today. Upgrade to Premium for unlimited Ace access!`,
                remaining: 0,
              }),
              {
                status: 429,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          // Upsert usage count
          await supabase.from("ace_messages").upsert(
            {
              user_id: userId,
              message_date: today,
              message_count: currentCount + 1,
            },
            { onConflict: "user_id,message_date" }
          );

          remainingMessages = FREE_DAILY_LIMIT - currentCount - 1;
        }
      }
    }

    // Build system prompt with optional question context
    let systemContent = SYSTEM_PROMPT;
    if (questionContext) {
      systemContent += `\n\nThe student is currently viewing this question:\n---\n${questionContext}\n---\nUse this context to help them if they ask about it.`;
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemContent },
            ...messages.slice(-20), // Last 20 messages for context window
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service is busy. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return streaming response with remaining messages header
    const headers: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
    };
    if (remainingMessages !== null) {
      headers["X-Remaining-Messages"] = String(remainingMessages);
    }
    if (isPremium) {
      headers["X-Premium"] = "true";
    }

    return new Response(response.body, { headers });
  } catch (e) {
    console.error("ace-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
