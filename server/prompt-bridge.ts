// Bridge module: loads Mom Test prompts for the relay server
// Uses fs directly since server doesn't use Next.js path aliases
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '..', 'prompts');

/**
 * Replaces {{PLACEHOLDER}} patterns in a template string.
 */
function replacePlaceholders(
  template: string,
  variables: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

/**
 * Builds the Mom Test interview system instruction for Gemini.
 */
export function buildInterviewPrompt(topic: string, targetUser: string): string {
  const template = readFileSync(join(PROMPTS_DIR, 'momTestEnforcer.md'), 'utf-8');
  return replacePlaceholders(template, { TOPIC: topic, TARGET_USER: targetUser });
}

/**
 * Builds the analysis prompt for Gemini Pro.
 */
export function buildAnalysisPrompt(
  transcript: string,
  businessIdea: string,
  targetUser: string,
): { systemPrompt: string; userContent: string } {
  const template = readFileSync(join(PROMPTS_DIR, 'insightAnalyzer.md'), 'utf-8');
  const systemPrompt = replacePlaceholders(template, {
    BUSINESS_IDEA: businessIdea,
    TARGET_USER: targetUser,
  });
  return { systemPrompt, userContent: `## Interview Transcript\n\n${transcript}` };
}
