import { callGeminiPro } from '@/lib/gemini';

// Mock @google/genai
const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

// Suppress logger output in tests
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const sampleSchema = {
  type: 'object' as const,
  properties: {
    score: { type: 'number' as const },
    summary: { type: 'string' as const },
  },
  required: ['score', 'summary'],
};

describe('callGeminiPro', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    process.env.GOOGLE_AI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_AI_API_KEY;
  });

  it('returns parsed JSON from Gemini response', async () => {
    const expected = { score: 75, summary: 'Good validation' };
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(expected),
    });

    const result = await callGeminiPro<typeof expected>(
      'You are an analyzer',
      'Analyze this transcript',
      sampleSchema,
    );

    expect(result).toEqual(expected);
  });

  it('passes correct model and config to SDK', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ score: 50, summary: 'test' }),
    });

    await callGeminiPro('system prompt', 'user content', sampleSchema);

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
        config: expect.objectContaining({
          systemInstruction: 'system prompt',
          responseMimeType: 'application/json',
          responseSchema: sampleSchema,
        }),
        contents: 'user content',
      }),
    );
  });

  it('retries on 429 error and succeeds', async () => {
    const error429 = new Error('Rate limit exceeded');
    (error429 as unknown as Record<string, unknown>).status = 429;

    mockGenerateContent
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce({
        text: JSON.stringify({ score: 60, summary: 'retry success' }),
      });

    const result = await callGeminiPro<{ score: number; summary: string }>(
      'system',
      'content',
      sampleSchema,
    );

    expect(result).toEqual({ score: 60, summary: 'retry success' });
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 error and succeeds', async () => {
    const error500 = new Error('Internal server error');
    (error500 as unknown as Record<string, unknown>).status = 500;

    mockGenerateContent
      .mockRejectedValueOnce(error500)
      .mockResolvedValueOnce({
        text: JSON.stringify({ score: 80, summary: 'recovered' }),
      });

    const result = await callGeminiPro<{ score: number; summary: string }>(
      'system',
      'content',
      sampleSchema,
    );

    expect(result).toEqual({ score: 80, summary: 'recovered' });
  });

  it('throws after max retries exhausted', async () => {
    const error429 = new Error('Rate limit');
    (error429 as unknown as Record<string, unknown>).status = 429;

    mockGenerateContent
      .mockRejectedValueOnce(error429)
      .mockRejectedValueOnce(error429)
      .mockRejectedValueOnce(error429);

    await expect(
      callGeminiPro('system', 'content', sampleSchema),
    ).rejects.toThrow('Rate limit');

    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });

  it('does not retry on non-retryable errors', async () => {
    const error400 = new Error('Bad request');
    (error400 as unknown as Record<string, unknown>).status = 400;

    mockGenerateContent.mockRejectedValueOnce(error400);

    await expect(
      callGeminiPro('system', 'content', sampleSchema),
    ).rejects.toThrow('Bad request');

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('throws if response text is empty', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: '' });

    await expect(
      callGeminiPro('system', 'content', sampleSchema),
    ).rejects.toThrow();
  });

  it('handles JSON wrapped in markdown code blocks', async () => {
    const expected = { score: 90, summary: 'Excellent' };
    mockGenerateContent.mockResolvedValueOnce({
      text: '```json\n' + JSON.stringify(expected) + '\n```',
    });

    const result = await callGeminiPro<typeof expected>(
      'system',
      'content',
      sampleSchema,
    );

    expect(result).toEqual(expected);
  });
});
