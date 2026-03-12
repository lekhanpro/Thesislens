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
    if (!key) {
      throw new Error(
        "GROQ_API_KEY is not set. Add it to your .env.local file. " +
        "Get a free key at https://console.groq.com"
      );
    }
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
              "You are a precise academic research assistant. Always respond with valid JSON only. " +
              "No markdown code fences, no explanations, no text before or after — just the raw JSON object or array.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
        // Request JSON output for supported models
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content ?? "";
      if (!raw.trim()) {
        throw new Error("Groq returned an empty response.");
      }
      return parseJsonSafe<T>(raw);
    } catch (err) {
      lastError = err as Error;
      console.error(`[groq] Attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);

      // If JSON mode not supported for this model, retry without it
      if (
        attempt === 1 &&
        (lastError.message?.includes("response_format") ||
          lastError.message?.includes("json_object"))
      ) {
        try {
          const response = await client.chat.completions.create({
            model: MODEL,
            messages: [
              {
                role: "system",
                content:
                  "You are a precise academic research assistant. Always respond with valid JSON only. " +
                  "No markdown code fences, no explanations — just raw JSON.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: maxTokens,
            temperature,
          });
          const raw = response.choices[0]?.message?.content ?? "";
          if (raw.trim()) return parseJsonSafe<T>(raw);
        } catch (fallbackErr) {
          lastError = fallbackErr as Error;
        }
      }

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw new Error(`Groq failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

/**
 * Generate a plain text response from Groq (useful for chat).
 */
export async function groqText(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2048,
  temperature = 0.3
): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: maxTokens,
    temperature,
  });
  return response.choices[0]?.message?.content ?? "";
}

/**
 * Parse JSON from LLM output, stripping markdown fences and trailing text.
 */
function parseJsonSafe<T>(raw: string): T {
  let cleaned = raw.trim();

  // Strip ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  // If the prompt asked for an array but got an object with a results key, unwrap it
  try {
    const parsed = JSON.parse(cleaned);
    // If it's already the right shape, return it
    return parsed as T;
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

/**
 * Unwrap array from possible object wrapper.
 * Groq json_object mode always returns an object, even when we request an array.
 * This helper extracts the first array value if the response was wrapped.
 */
export function unwrapArray<T>(result: T | Record<string, T[]>): T[] {
  if (Array.isArray(result)) return result as T[];
  // Find first array value in the object
  const values = Object.values(result as Record<string, unknown>);
  const arr = values.find(Array.isArray);
  return (arr as T[]) ?? [];
}
