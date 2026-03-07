// Implements #9: Analysis pipeline — auto-triggered on session end
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const GEMINI_PRO_MODEL = 'gemini-2.5-pro-preview-06-05';
const MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = [429, 500, 503];

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: number;
}

interface AnalysisResult {
  validationScore: number;
  painPoints: { title: string; severity: string; evidence: string[] }[];
  themes: string[];
  nextSteps: string[];
  summary: string;
  finalVerdict: string;
}

const ANALYSIS_JSON_SCHEMA = {
  type: 'object' as const,
  properties: {
    validationScore: { type: 'number' as const },
    painPoints: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' as const },
          severity: { type: 'string' as const, enum: ['low', 'medium', 'high', 'critical'] },
          evidence: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['title', 'severity', 'evidence'],
      },
    },
    themes: { type: 'array' as const, items: { type: 'string' as const } },
    nextSteps: { type: 'array' as const, items: { type: 'string' as const } },
    summary: { type: 'string' as const },
    finalVerdict: { type: 'string' as const, enum: ['VALIDATED', 'PARTIALLY_VALIDATED', 'NOT_VALIDATED', 'PIVOT_NEEDED'] },
  },
  required: ['validationScore', 'painPoints', 'themes', 'nextSteps', 'summary', 'finalVerdict'],
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
}

function buildSystemPrompt(businessIdea: string, targetUser: string): string {
  return `You are an expert at analyzing customer discovery interviews conducted using the Mom Test methodology.

## Context
- **Business Idea**: ${businessIdea}
- **Target User**: ${targetUser}

## Your Task
Analyze the provided interview transcript and produce a structured insight report focusing on:
1. Identifying validated pain points with concrete evidence
2. Assessing evidence quality (facts vs opinions)
3. Detecting recurring themes
4. Recommending actionable next steps

## Pain Point Severity: critical > high > medium > low
## Validation Score: 0-100 (80-100 strong, 60-79 moderate, 40-59 weak, 20-39 poor, 0-19 none)
## Base analysis ONLY on what was actually said. Be honest about weak evidence.`;
}

/**
 * Analyzes an interview transcript using Gemini Pro.
 * Reads interview from Supabase, calls Gemini, writes insight, updates status.
 */
export async function analyzeTranscript(interviewId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch interview
  const { data: interview, error: fetchError } = await supabase
    .from('interviews')
    .select('id, topic, target_user, transcript')
    .eq('id', interviewId)
    .single();

  if (fetchError || !interview) {
    throw new Error(`Interview not found: ${interviewId}`);
  }

  const transcript = interview.transcript as TranscriptEntry[] | null;
  if (!transcript || transcript.length === 0) {
    throw new Error(`Cannot analyze interview with empty transcript: ${interviewId}`);
  }

  // 2. Build prompts
  const systemPrompt = buildSystemPrompt(interview.topic, interview.target_user);
  const formattedTranscript = transcript
    .map((entry: TranscriptEntry) => `[${entry.speaker}]: ${entry.text}`)
    .join('\n');
  const userContent = `## Interview Transcript\n\n${formattedTranscript}`;

  // 3. Call Gemini Pro with retry
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
  }

  const genAI = new GoogleGenAI({ apiKey });
  let result: AnalysisResult | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await genAI.models.generateContent({
        model: GEMINI_PRO_MODEL,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: ANALYSIS_JSON_SCHEMA,
        },
        contents: userContent,
      });

      const text = response.text;
      if (!text) throw new Error('Empty response from Gemini');

      const cleaned = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      result = JSON.parse(cleaned) as AnalysisResult;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const status = (err as Record<string, unknown>).status as number | undefined;
      if (status && RETRYABLE_STATUS_CODES.includes(status) && attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw lastError;
    }
  }

  if (!result) {
    throw lastError ?? new Error('Gemini call failed');
  }

  // 4. Write insight to Supabase
  const { error: insertError } = await supabase.from('insights').insert({
    interview_id: interviewId,
    validation_score: result.validationScore,
    pain_points: result.painPoints,
    themes: result.themes,
    next_steps: result.nextSteps,
    raw_analysis: JSON.stringify(result),
  });

  if (insertError) {
    throw new Error(`Failed to insert insight: ${insertError.message}`);
  }

  // 5. Update interview status to analyzed
  const { error: updateError } = await supabase
    .from('interviews')
    .update({ status: 'analyzed' })
    .eq('id', interviewId);

  if (updateError) {
    throw new Error(`Failed to update interview status: ${updateError.message}`);
  }

  // 6. Log analysis event
  await supabase.from('ai_logs').insert({
    interview_id: interviewId,
    event_type: 'analysis_completed',
    payload: { validationScore: result.validationScore, verdict: result.finalVerdict },
  });
}
