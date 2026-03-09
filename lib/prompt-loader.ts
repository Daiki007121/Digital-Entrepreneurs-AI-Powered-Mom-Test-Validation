import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Replaces {{PLACEHOLDER}} patterns in a template string with provided values.
 */
export function replacePlaceholders(
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
 * Loads a prompt file from the /prompts/ directory and replaces placeholders.
 * @param promptName - The name of the prompt file (without .md extension)
 * @param variables - Key-value pairs to replace in the template
 * @returns The processed prompt string
 * @throws If the prompt file does not exist
 */
export function loadPrompt(
  promptName: string,
  variables: Record<string, string>,
): string {
  const promptPath = join(process.cwd(), 'prompts', `${promptName}.md`);
  const template = readFileSync(promptPath, 'utf-8');
  return replacePlaceholders(template, variables);
}
