/**
 * Tests for server/supabase-ops.ts
 */

// Mock Supabase
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockUpdateEq = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === 'interviews') {
        return {
          update: mockUpdate.mockReturnValue({
            eq: mockEq,
          }),
        };
      }
      if (table === 'ai_logs') {
        return {
          insert: mockInsert,
        };
      }
      return {};
    },
  })),
}));

import { updateTranscript, completeInterview, logAiEvent } from '@/server/supabase-ops';

describe('server/supabase-ops', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('updateTranscript', () => {
    it('calls update with parsed transcript JSON', async () => {
      mockEq.mockResolvedValueOnce({ error: null });

      const transcript = [{ speaker: 'ai', text: 'Hello', timestamp: 1000 }];
      await updateTranscript('interview-1', JSON.stringify(transcript));

      expect(mockUpdate).toHaveBeenCalledWith({
        transcript: transcript,
      });
    });

    it('calls .eq with the interviewId', async () => {
      mockEq.mockResolvedValueOnce({ error: null });

      await updateTranscript('interview-abc', JSON.stringify([]));

      expect(mockEq).toHaveBeenCalledWith('id', 'interview-abc');
    });

    it('throws when Supabase returns an error', async () => {
      mockEq.mockResolvedValueOnce({ error: { message: 'DB error' } });

      await expect(
        updateTranscript('interview-1', JSON.stringify([]))
      ).rejects.toThrow('Failed to update transcript: DB error');
    });

    it('does not throw on success', async () => {
      mockEq.mockResolvedValueOnce({ error: null });

      await expect(
        updateTranscript('interview-1', JSON.stringify([]))
      ).resolves.toBeUndefined();
    });
  });

  describe('completeInterview', () => {
    it('calls update with transcript, status, and duration', async () => {
      mockEq.mockResolvedValueOnce({ error: null });

      const transcript = [{ speaker: 'user', text: 'Hi', timestamp: 2000 }];
      await completeInterview('interview-2', JSON.stringify(transcript), 300);

      expect(mockUpdate).toHaveBeenCalledWith({
        transcript: transcript,
        status: 'completed',
        duration_seconds: 300,
      });
    });

    it('calls .eq with the interviewId', async () => {
      mockEq.mockResolvedValueOnce({ error: null });

      await completeInterview('interview-xyz', JSON.stringify([]), 120);

      expect(mockEq).toHaveBeenCalledWith('id', 'interview-xyz');
    });

    it('throws when Supabase returns an error', async () => {
      mockEq.mockResolvedValueOnce({ error: { message: 'Update failed' } });

      await expect(
        completeInterview('interview-2', JSON.stringify([]), 300)
      ).rejects.toThrow('Failed to complete interview: Update failed');
    });

    it('does not throw on success', async () => {
      mockEq.mockResolvedValueOnce({ error: null });

      await expect(
        completeInterview('interview-2', JSON.stringify([]), 300)
      ).resolves.toBeUndefined();
    });
  });

  describe('logAiEvent', () => {
    it('inserts a log entry with correct fields', async () => {
      mockInsert.mockResolvedValueOnce({ error: null });

      await logAiEvent('interview-3', 'tool_call', { tool: 'search' });

      expect(mockInsert).toHaveBeenCalledWith({
        interview_id: 'interview-3',
        event_type: 'tool_call',
        payload: { tool: 'search' },
      });
    });

    it('does not throw on success', async () => {
      mockInsert.mockResolvedValueOnce({ error: null });

      await expect(
        logAiEvent('interview-3', 'model_response', 'some text')
      ).resolves.toBeUndefined();
    });

    it('logs error message but does not throw when insert fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      mockInsert.mockResolvedValueOnce({ error: { message: 'Insert failed' } });

      // Should not throw
      await expect(
        logAiEvent('interview-3', 'error_event', null)
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log AI event: Insert failed')
      );
      errorSpy.mockRestore();
    });

    it('handles null payload gracefully', async () => {
      mockInsert.mockResolvedValueOnce({ error: null });

      await expect(
        logAiEvent('interview-3', 'event', null)
      ).resolves.toBeUndefined();

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ payload: null })
      );
    });
  });
});
