/**
 * Tests for lib/stores/interview-store.ts
 */
import { useInterviewStore } from '@/lib/stores/interview-store';
import type { TranscriptEntry } from '@/types';

// Helper to get current state
const getState = () => useInterviewStore.getState();

describe('useInterviewStore', () => {
  beforeEach(() => {
    // Reset to initial state before each test
    useInterviewStore.getState().reset();
  });

  describe('initial state', () => {
    it('has null interviewId', () => {
      expect(getState().interviewId).toBeNull();
    });

    it('has empty participantName', () => {
      expect(getState().participantName).toBe('');
    });

    it('has empty topic', () => {
      expect(getState().topic).toBe('');
    });

    it('has empty targetUser', () => {
      expect(getState().targetUser).toBe('');
    });

    it('has empty transcript array', () => {
      expect(getState().transcript).toEqual([]);
    });

    it('has elapsedSeconds of 0', () => {
      expect(getState().elapsedSeconds).toBe(0);
    });

    it('has isRecording false', () => {
      expect(getState().isRecording).toBe(false);
    });

    it('has aiState idle', () => {
      expect(getState().aiState).toBe('idle');
    });

    it('has silenceSeconds of 0', () => {
      expect(getState().silenceSeconds).toBe(0);
    });
  });

  describe('setSession', () => {
    it('sets the interviewId', () => {
      getState().setSession({
        interviewId: 'test-id-123',
        participantName: 'Alice',
        topic: 'SaaS for dentists',
        targetUser: 'dental clinic owners',
      });

      expect(getState().interviewId).toBe('test-id-123');
    });

    it('sets the participantName', () => {
      getState().setSession({
        interviewId: 'id',
        participantName: 'Bob',
        topic: 'topic',
        targetUser: 'users',
      });

      expect(getState().participantName).toBe('Bob');
    });

    it('sets topic and targetUser', () => {
      getState().setSession({
        interviewId: 'id',
        participantName: 'Carol',
        topic: 'Scheduling SaaS',
        targetUser: 'freelancers',
      });

      expect(getState().topic).toBe('Scheduling SaaS');
      expect(getState().targetUser).toBe('freelancers');
    });
  });

  describe('addTranscriptEntry', () => {
    it('appends an entry to the transcript', () => {
      const entry: TranscriptEntry = { speaker: 'ai', text: 'Hello!', timestamp: 1000 };
      getState().addTranscriptEntry(entry);

      expect(getState().transcript).toHaveLength(1);
      expect(getState().transcript[0]).toEqual(entry);
    });

    it('appends multiple entries in order', () => {
      const entry1: TranscriptEntry = { speaker: 'ai', text: 'Hello!', timestamp: 1000 };
      const entry2: TranscriptEntry = { speaker: 'user', text: 'Hi there!', timestamp: 2000 };

      getState().addTranscriptEntry(entry1);
      getState().addTranscriptEntry(entry2);

      expect(getState().transcript).toHaveLength(2);
      expect(getState().transcript[0].speaker).toBe('ai');
      expect(getState().transcript[1].speaker).toBe('user');
    });

    it('does not mutate existing entries', () => {
      const entry1: TranscriptEntry = { speaker: 'ai', text: 'First', timestamp: 1000 };
      getState().addTranscriptEntry(entry1);
      const snapshotAfterFirst = getState().transcript[0];

      const entry2: TranscriptEntry = { speaker: 'user', text: 'Second', timestamp: 2000 };
      getState().addTranscriptEntry(entry2);

      // First entry should remain the same reference
      expect(getState().transcript[0]).toEqual(snapshotAfterFirst);
    });
  });

  describe('setElapsedSeconds', () => {
    it('updates elapsedSeconds', () => {
      getState().setElapsedSeconds(120);
      expect(getState().elapsedSeconds).toBe(120);
    });

    it('can update to 0', () => {
      getState().setElapsedSeconds(60);
      getState().setElapsedSeconds(0);
      expect(getState().elapsedSeconds).toBe(0);
    });
  });

  describe('setIsRecording', () => {
    it('sets isRecording to true', () => {
      getState().setIsRecording(true);
      expect(getState().isRecording).toBe(true);
    });

    it('sets isRecording to false', () => {
      getState().setIsRecording(true);
      getState().setIsRecording(false);
      expect(getState().isRecording).toBe(false);
    });
  });

  describe('setAiState', () => {
    it('sets aiState to listening', () => {
      getState().setAiState('listening');
      expect(getState().aiState).toBe('listening');
    });

    it('sets aiState to speaking', () => {
      getState().setAiState('speaking');
      expect(getState().aiState).toBe('speaking');
    });

    it('sets aiState to thinking', () => {
      getState().setAiState('thinking');
      expect(getState().aiState).toBe('thinking');
    });

    it('sets aiState back to idle', () => {
      getState().setAiState('speaking');
      getState().setAiState('idle');
      expect(getState().aiState).toBe('idle');
    });
  });

  describe('setSilenceSeconds', () => {
    it('updates silenceSeconds', () => {
      getState().setSilenceSeconds(10);
      expect(getState().silenceSeconds).toBe(10);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      // Modify some state
      getState().setSession({
        interviewId: 'test-id',
        participantName: 'Alice',
        topic: 'Test topic',
        targetUser: 'test users',
      });
      getState().addTranscriptEntry({ speaker: 'ai', text: 'Hello', timestamp: 1000 });
      getState().setElapsedSeconds(300);
      getState().setIsRecording(true);
      getState().setAiState('speaking');
      getState().setSilenceSeconds(15);

      // Reset
      getState().reset();

      // Verify everything is back to initial
      expect(getState().interviewId).toBeNull();
      expect(getState().participantName).toBe('');
      expect(getState().topic).toBe('');
      expect(getState().targetUser).toBe('');
      expect(getState().transcript).toEqual([]);
      expect(getState().elapsedSeconds).toBe(0);
      expect(getState().isRecording).toBe(false);
      expect(getState().aiState).toBe('idle');
      expect(getState().silenceSeconds).toBe(0);
    });
  });
});
