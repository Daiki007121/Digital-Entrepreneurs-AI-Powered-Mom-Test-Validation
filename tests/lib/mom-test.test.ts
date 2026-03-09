import {
  buildInterviewPrompt,
  buildAnalysisPrompt,
  detectLeadingQuestion,
} from '@/lib/mom-test';

describe('buildInterviewPrompt', () => {
  it('includes the topic in the output', () => {
    const result = buildInterviewPrompt('SaaS for dentists', 'dental clinic owners');
    expect(result).toContain('SaaS for dentists');
  });

  it('includes the target user in the output', () => {
    const result = buildInterviewPrompt('SaaS for dentists', 'dental clinic owners');
    expect(result).toContain('dental clinic owners');
  });

  it('includes Mom Test rules', () => {
    const result = buildInterviewPrompt('Any topic', 'Any user');
    expect(result).toContain('NEVER');
    expect(result).toContain('past behavior');
  });

  it('does not contain raw placeholders', () => {
    const result = buildInterviewPrompt('Topic', 'User');
    expect(result).not.toContain('{{TOPIC}}');
    expect(result).not.toContain('{{TARGET_USER}}');
  });
});

describe('buildAnalysisPrompt', () => {
  const transcript = [
    { speaker: 'ai' as const, text: 'Tell me about your day', timestamp: 0 },
    { speaker: 'user' as const, text: 'I spend hours on scheduling', timestamp: 5000 },
  ];

  it('includes the business idea', () => {
    const result = buildAnalysisPrompt(transcript, 'Scheduling app', 'freelancers');
    expect(result.systemPrompt).toContain('Scheduling app');
  });

  it('includes the target user', () => {
    const result = buildAnalysisPrompt(transcript, 'Scheduling app', 'freelancers');
    expect(result.systemPrompt).toContain('freelancers');
  });

  it('includes transcript content', () => {
    const result = buildAnalysisPrompt(transcript, 'Scheduling app', 'freelancers');
    expect(result.userContent).toContain('Tell me about your day');
    expect(result.userContent).toContain('I spend hours on scheduling');
  });

  it('returns an object with systemPrompt and userContent', () => {
    const result = buildAnalysisPrompt(transcript, 'Scheduling app', 'freelancers');
    expect(result).toHaveProperty('systemPrompt');
    expect(result).toHaveProperty('userContent');
    expect(typeof result.systemPrompt).toBe('string');
    expect(typeof result.userContent).toBe('string');
  });
});

describe('detectLeadingQuestion', () => {
  // Questions that ARE leading (should detect)
  const leadingQuestions = [
    'Would you use a tool that does this?',
    'Do you think this is a good idea?',
    'Would you pay for something like this?',
    "Don't you find scheduling frustrating?",
    'Would you be interested in a solution that automates this?',
    "Wouldn't it be great if you could save time on this?",
    'Do you like the idea of automating your workflow?',
    'Could you see yourself using this daily?',
    'Will you switch to a new tool if it solves this?',
  ];

  // Questions that are NOT leading (compliant Mom Test questions)
  const validQuestions = [
    'Tell me about the last time you dealt with scheduling.',
    'How do you currently handle this problem?',
    'What happened when you tried to solve this?',
    'Can you walk me through your typical day?',
    'What tools are you currently using?',
    'How often does this come up?',
    'What did you do about it?',
    'Who else deals with this problem?',
  ];

  it.each(leadingQuestions)('detects leading question: "%s"', (question) => {
    const result = detectLeadingQuestion(question);
    expect(result.isLeading).toBe(true);
    expect(result.pattern).toBeDefined();
  });

  it.each(validQuestions)('allows valid question: "%s"', (question) => {
    const result = detectLeadingQuestion(question);
    expect(result.isLeading).toBe(false);
  });

  it('handles empty string', () => {
    const result = detectLeadingQuestion('');
    expect(result.isLeading).toBe(false);
  });
});
