import { loadPrompt, replacePlaceholders } from '@/lib/prompt-loader';

describe('replacePlaceholders', () => {
  it('replaces a single placeholder', () => {
    const result = replacePlaceholders('Hello {{NAME}}!', { NAME: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('replaces multiple different placeholders', () => {
    const result = replacePlaceholders('{{GREETING}} {{NAME}}!', {
      GREETING: 'Hi',
      NAME: 'Alice',
    });
    expect(result).toBe('Hi Alice!');
  });

  it('replaces all occurrences of the same placeholder', () => {
    const result = replacePlaceholders('{{X}} and {{X}}', { X: 'foo' });
    expect(result).toBe('foo and foo');
  });

  it('leaves unknown placeholders untouched', () => {
    const result = replacePlaceholders('{{KNOWN}} {{UNKNOWN}}', {
      KNOWN: 'yes',
    });
    expect(result).toBe('yes {{UNKNOWN}}');
  });

  it('handles empty variables object', () => {
    const result = replacePlaceholders('No {{VARS}} here', {});
    expect(result).toBe('No {{VARS}} here');
  });

  it('handles template with no placeholders', () => {
    const result = replacePlaceholders('Plain text', { KEY: 'value' });
    expect(result).toBe('Plain text');
  });
});

describe('loadPrompt', () => {
  it('loads momTestEnforcer.md and replaces placeholders', () => {
    const result = loadPrompt('momTestEnforcer', {
      TOPIC: 'SaaS for dentists',
      TARGET_USER: 'dental clinic owners',
    });
    expect(result).toContain('SaaS for dentists');
    expect(result).toContain('dental clinic owners');
    expect(result).not.toContain('{{TOPIC}}');
    expect(result).not.toContain('{{TARGET_USER}}');
  });

  it('loads insightAnalyzer.md and replaces placeholders', () => {
    const result = loadPrompt('insightAnalyzer', {
      BUSINESS_IDEA: 'AI scheduling tool',
      TARGET_USER: 'freelance designers',
    });
    expect(result).toContain('AI scheduling tool');
    expect(result).toContain('freelance designers');
    expect(result).not.toContain('{{BUSINESS_IDEA}}');
    expect(result).not.toContain('{{TARGET_USER}}');
  });

  it('throws for non-existent prompt file', () => {
    expect(() => loadPrompt('nonExistentPrompt', {})).toThrow();
  });
});
