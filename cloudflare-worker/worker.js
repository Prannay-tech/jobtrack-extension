/**
 * JobTrack AI Worker — Cloudflare Worker
 * Proxies job description analysis requests to Groq API.
 * Hides the Groq API key from the Chrome extension.
 *
 * Rate limit: 30 analyses per IP per day (stored in KV)
 * Deploy: wrangler deploy
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const RATE_LIMIT    = 30;   // max requests per IP per day
const MAX_JD_CHARS  = 4000; // truncate long job descriptions

const SYSTEM_PROMPT = `You are a job posting analyzer. Given a job description, extract structured data and return ONLY valid JSON — no markdown, no explanation, just the JSON object.

Return exactly this structure:
{
  "brief": "1-2 sentence summary of the role and what they are looking for",
  "yoe": "one of: Entry (0-2y) | Mid (3-5y) | Senior (6-9y) | Staff (10+y) | Not specified",
  "skills": "top 5 skills as comma-separated string, e.g. Python, React, AWS, SQL, Docker"
}

Rules:
- brief: focus on the role's core purpose and key responsibility, keep it under 25 words
- yoe: pick the bucket that best matches required experience; if a range spans two buckets pick the higher one
- skills: only hard/technical skills or clearly required domain skills; no soft skills like "communication"`;

export default {
  async fetch(request, env) {
    // ── CORS preflight ──────────────────────────────────────────────────────
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    if (request.method !== "POST") {
      return corsResponse(JSON.stringify({ error: "Method not allowed" }), 405);
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: "Invalid JSON body" }), 400);
    }

    const { jobDescription, title, company } = body;
    if (!jobDescription || jobDescription.trim().length < 50) {
      return corsResponse(JSON.stringify({ error: "Job description too short" }), 400);
    }

    // ── Rate limiting via KV ────────────────────────────────────────────────
    const ip      = request.headers.get("CF-Connecting-IP") || "unknown";
    const today   = new Date().toISOString().slice(0, 10);
    const kvKey   = `rl:${ip}:${today}`;

    if (env.JOBTRACK_KV) {
      const count = parseInt((await env.JOBTRACK_KV.get(kvKey)) || "0", 10);
      if (count >= RATE_LIMIT) {
        return corsResponse(
          JSON.stringify({ error: `Daily limit of ${RATE_LIMIT} analyses reached. Try again tomorrow.` }),
          429
        );
      }
      // Increment counter (expires at midnight via TTL)
      const secondsUntilMidnight = 86400 - (Date.now() / 1000 % 86400);
      await env.JOBTRACK_KV.put(kvKey, String(count + 1), {
        expirationTtl: Math.ceil(secondsUntilMidnight),
      });
    }

    // ── Build prompt ────────────────────────────────────────────────────────
    const jdText = jobDescription.slice(0, MAX_JD_CHARS);
    const userMessage = `Job Title: ${title || "Unknown"}
Company: ${company || "Unknown"}

Job Description:
${jdText}`;

    // ── Call Groq ───────────────────────────────────────────────────────────
    let groqResponse;
    try {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user",   content: userMessage },
          ],
          temperature: 0.1,
          max_tokens: 256,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Groq error:", err);
        return corsResponse(JSON.stringify({ error: "AI service error" }), 502);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return corsResponse(JSON.stringify({ error: "Empty AI response" }), 502);
      }

      groqResponse = JSON.parse(content);
    } catch (err) {
      console.error("Worker error:", err);
      return corsResponse(JSON.stringify({ error: "Worker processing error" }), 500);
    }

    // ── Validate + return ───────────────────────────────────────────────────
    const result = {
      brief:  groqResponse.brief  || "",
      yoe:    groqResponse.yoe    || "Not specified",
      skills: groqResponse.skills || "",
    };

    return corsResponse(JSON.stringify(result), 200);
  },
};

// ── Helper ──────────────────────────────────────────────────────────────────
function corsResponse(body, status) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  return new Response(body, { status, headers });
}
