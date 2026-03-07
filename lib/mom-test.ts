import { loadPrompt } from '@/lib/prompt-loader';

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: number;
}

interface AnalysisPrompt {
  systemPrompt: string;
  userContent: string;
}

interface LeadingQuestionResult {
  isLeading: boolean;
  pattern?: string;
}

/** Patterns that indicate a leading or hypothetical question */
const LEADING_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /\bwould you\b/i, label: 'hypothetical (would you)' },
  { regex: /\bwill you\b/i, label: 'hypothetical (will you)' },
  { regex: /\bcould you see yourself\b/i, label: 'hypothetical (could you see yourself)' },
  { regex: /\bdo you think\b.*\b(good|great|nice|useful|helpful)\b/i, label: 'opinion-seeking' },
  { regex: /\bdo you like\b/i, label: 'opinion-seeking (do you like)' },
  { regex: /\bdon'?t you find\b/i, label: 'leading (negative question)' },
  { regex: /\bwouldn'?t it be\b/i, label: 'leading (suggestive)' },
  { regex: /\bwould you pay\b/i, label: 'hypothetical purchase' },
  { regex: /\bwould you be interested\b/i, label: 'hypothetical interest' },
  { regex: /\bis a good idea\b/i, label: 'opinion-seeking (good idea)' },
];

/**
 * Builds the system instruction for Gemini Live API interview sessions.
 * @param topic - The business idea or topic being explored
 * @param targetUser - Description of the target user
 * @returns The complete system prompt string
 */
export function buildInterviewPrompt(topic: string, targetUser: string): string {
  return loadPrompt('momTestEnforcer', {
    TOPIC: topic,
    TARGET_USER: targetUser,
  });
}

/**
 * Builds the prompt for Gemini analysis of an interview transcript.
 * @param transcript - Array of transcript entries
 * @param businessIdea - The business idea being validated
 * @param targetUser - Description of the target user
 * @returns Object with systemPrompt and userContent
 */
export function buildAnalysisPrompt(
  transcript: TranscriptEntry[],
  businessIdea: string,
  targetUser: string,
): AnalysisPrompt {
  const systemPrompt = loadPrompt('insightAnalyzer', {
    BUSINESS_IDEA: businessIdea,
    TARGET_USER: targetUser,
  });

  const formattedTranscript = transcript
    .map((entry) => `[${entry.speaker}]: ${entry.text}`)
    .join('\n');

  const userContent = `## Interview Transcript\n\n${formattedTranscript}`;

  return { systemPrompt, userContent };
}

/**
 * Detects whether a given text contains a leading question that violates Mom Test rules.
 * @param text - The text to analyze
 * @returns Object indicating if the question is leading and which pattern matched
 */
export function detectLeadingQuestion(text: string): LeadingQuestionResult {
  if (!text.trim()) {
    return { isLeading: false };
  }

  for (const { regex, label } of LEADING_PATTERNS) {
    if (regex.test(text)) {
      return { isLeading: true, pattern: label };
    }
  }

  return { isLeading: false };
}
