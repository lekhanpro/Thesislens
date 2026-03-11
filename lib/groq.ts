/**
 * Groq LLM client wrapper for the ThesisLens Next.js app.
 * Handles JSON generation, retry logic, and malformed-response recovery.
 * Server-side only — never import in client components.
 */

import Groq from "groq-sdk";

let _client: Groq | null = null;

function getClient(): Groq {
  if (!_client) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY is not set in environment variables.");
    _client = new Groq({ apiKey: key });
  }
  return _client;
}

const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const MAX_RETRIES = 3;

/**
 * Generate a structured JSON response from Groq.
 * Retries up to MAX_RETRIES times on failure.
 */
export async function groqJson<T>(
  prompt: string,
  maxTokens = 4096,
  temperature = 0.2
): Promise<T> {
  const client = getClient();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a precise academic research assistant. Always respond with valid JSON only. No markdown, no explanations, just the JSON object or array.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const raw = response.choices[0]?.message?.content ?? "";
      return parseJsonSafe<T>(raw);
    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw new Error(`Groq failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

/**
 * Parse JSON from LLM output, stripping markdown fences and trailing text.
 */
function parseJsonSafe<T>(raw: string): T {
  let cleaned = raw.trim();

  // Strip ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try extracting the first JSON object or array
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {
        // Remove trailing commas and try once more
        const fixed = match[1].replace(/,(\s*[}\]])/g, "$1");
        return JSON.parse(fixed) as T;
      }
    }
    throw new Error(`Cannot parse Groq response as JSON. Raw: ${raw.slice(0, 300)}`);
  }
}
