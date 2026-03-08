// Implements #9: Gemini analysis wrapper with retry logic
import { GoogleGenAI } from '@google/genai';
import { logger } from '@/lib/logger';

const MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = [429, 500, 503];
const GEMINI_PRO_MODEL = 'gemini-2.5-flash';

/**
 * Calls Gemini Pro with structured JSON output.
 * Retries up to 3 times on 429/500/503 errors with exponential backoff.
 *
 * @param systemPrompt - System instruction for the model
 * @param userContent - User content to analyze
 * @param jsonSchema - JSON Schema for structured output
 * @returns Parsed JSON response of type T
 */
export async function callGeminiPro<T>(
  systemPrompt: string,
  userContent: string,
  jsonSchema: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
  }

  const genAI = new GoogleGenAI({ apiKey });
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await genAI.models.generateContent({
        model: GEMINI_PRO_MODEL,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: jsonSchema,
        },
        contents: userContent,
      });

      const text = response.text;
      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      // Strip markdown code block wrapper if present
      const cleaned = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      const parsed = JSON.parse(cleaned) as T;

      logger.info('Gemini Pro call succeeded', { model: GEMINI_PRO_MODEL, attempt });
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const status = (err as Record<string, unknown>).status as number | undefined;

      if (status && RETRYABLE_STATUS_CODES.includes(status) && attempt < MAX_RETRIES - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn('Gemini Pro call failed, retrying', { status, attempt, delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error('Gemini call failed after retries');
}
