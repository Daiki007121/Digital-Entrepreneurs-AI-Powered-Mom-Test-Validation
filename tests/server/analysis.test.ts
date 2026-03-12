// TDD tests for server/analysis.ts
import { analyzeTranscript } from '../../server/analysis';

// Mock Supabase
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateEq = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'interviews') {
        return {
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              single: mockSingle,
            }),
          }),
          update: mockUpdate.mockReturnValue({
            eq: mockUpdateEq.mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'insights') {
        return {
          insert: mockInsert.mockResolvedValue({ error: null }),
        };
      }
      if (table === 'ai_logs') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    },
  }),
}));

// Mock Gemini
const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

const mockAnalysisResult = {
  validationScore: 72,
  painPoints: [
    {
      title: 'Manual scheduling is painful',
      severity: 'high',
      evidence: ['I spend 2 hours every week scheduling appointments manually'],
    },
  ],
  themes: ['time-consuming manual processes'],
  nextSteps: ['Build scheduling prototype'],
  summary: 'Moderate validation with clear pain points.',
  finalVerdict: 'PARTIALLY_VALIDATED',
};

const mockInterview = {
  id: 'interview-1',
  topic: 'Scheduling SaaS for dentists',
  target_user: 'dental office managers',
  transcript: [
    { speaker: 'ai', text: 'Tell me about your scheduling process.', timestamp: 1000 },
    { speaker: 'user', text: 'I spend 2 hours every week scheduling appointments manually.', timestamp: 2000 },
  ],
};

describe('analyzeTranscript', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.GOOGLE_AI_API_KEY = 'test-gemini-key';
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
  });

  it('reads interview, calls Gemini, writes insight, updates status', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockInterview, error: null });
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockAnalysisResult),
    });

    await analyzeTranscript('interview-1');

    // Verifies interview was fetched
    expect(mockSelect).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'interview-1');

    // Verifies Gemini was called
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    // Verifies insight was inserted
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        interview_id: 'interview-1',
        validation_score: 72,
        pain_points: mockAnalysisResult.painPoints,
        themes: mockAnalysisResult.themes,
        next_steps: mockAnalysisResult.nextSteps,
        raw_analysis: JSON.stringify(mockAnalysisResult),
      }),
    );

    // Verifies interview status updated to analyzed
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'analyzed' });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'interview-1');
  });

  it('throws if interview not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    await expect(analyzeTranscript('nonexistent')).rejects.toThrow('Interview not found');
  });

  it('throws if transcript is empty', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { ...mockInterview, transcript: [] },
      error: null,
    });

    await expect(analyzeTranscript('interview-1')).rejects.toThrow('empty transcript');
  });

  it('throws if transcript is null', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { ...mockInterview, transcript: null },
      error: null,
    });

    await expect(analyzeTranscript('interview-1')).rejects.toThrow('empty transcript');
  });

  it('throws if GOOGLE_AI_API_KEY is not set', async () => {
    delete process.env.GOOGLE_AI_API_KEY;
    mockSingle.mockResolvedValueOnce({ data: mockInterview, error: null });

    await expect(analyzeTranscript('interview-1')).rejects.toThrow('GOOGLE_AI_API_KEY');
  });

  it('throws if SUPABASE_URL is not set', async () => {
    delete process.env.SUPABASE_URL;

    await expect(analyzeTranscript('interview-1')).rejects.toThrow(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    );
  });

  it('retries on 429 and succeeds', async () => {
    const error429 = new Error('Rate limit');
    (error429 as unknown as Record<string, unknown>).status = 429;

    mockSingle.mockResolvedValueOnce({ data: mockInterview, error: null });
    mockGenerateContent
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce({ text: JSON.stringify(mockAnalysisResult) });

    await analyzeTranscript('interview-1');

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockInsert).toHaveBeenCalled();
  });

  it('throws if Gemini insert to insights fails', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockInterview, error: null });
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(mockAnalysisResult) });
    mockInsert.mockResolvedValueOnce({ error: { message: 'Insert failed' } });

    await expect(analyzeTranscript('interview-1')).rejects.toThrow('Failed to insert insight');
  });

  it('throws if interview status update fails', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockInterview, error: null });
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(mockAnalysisResult) });
    mockInsert.mockResolvedValueOnce({ error: null }); // insights insert succeeds
    mockUpdateEq.mockResolvedValueOnce({ error: { message: 'Update failed' } });

    await expect(analyzeTranscript('interview-1')).rejects.toThrow('Failed to update interview status');
  });

  it('throws after max retries exhausted on 500 error', async () => {
    const error500 = new Error('Internal server error');
    (error500 as unknown as Record<string, unknown>).status = 500;

    mockSingle.mockResolvedValueOnce({ data: mockInterview, error: null });
    mockGenerateContent
      .mockRejectedValueOnce(error500)
      .mockRejectedValueOnce(error500)
      .mockRejectedValueOnce(error500);

    await expect(analyzeTranscript('interview-1')).rejects.toThrow('Internal server error');
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });

  it('does not retry on non-retryable errors', async () => {
    const error400 = new Error('Bad request');
    (error400 as unknown as Record<string, unknown>).status = 400;

    mockSingle.mockResolvedValueOnce({ data: mockInterview, error: null });
    mockGenerateContent.mockRejectedValueOnce(error400);

    await expect(analyzeTranscript('interview-1')).rejects.toThrow('Bad request');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});
