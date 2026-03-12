/**
 * Tests for server/session-logic.ts — pure logic functions
 */
import {
  shouldWarn,
  shouldAutoEnd,
  checkSilenceTimeout,
  formatTranscriptForCheckpoint,
} from '@/server/session-logic';

describe('shouldWarn (server)', () => {
  it('returns true when elapsed reaches warning threshold (720s)', () => {
    expect(shouldWarn(720, new Set())).toBe(true);
  });

  it('returns true when elapsed exceeds warning threshold', () => {
    expect(shouldWarn(800, new Set())).toBe(true);
  });

  it('returns false when below warning threshold', () => {
    expect(shouldWarn(719, new Set())).toBe(false);
  });

  it('returns false when warning already sent', () => {
    expect(shouldWarn(720, new Set(['duration_warning']))).toBe(false);
  });

  it('returns false with multiple warnings already sent (including duration_warning)', () => {
    const sent = new Set(['some_other_warning', 'duration_warning']);
    expect(shouldWarn(900, sent)).toBe(false);
  });

  it('returns true when other warnings sent but not duration_warning', () => {
    const sent = new Set(['some_other_warning']);
    expect(shouldWarn(720, sent)).toBe(true);
  });
});

describe('shouldAutoEnd (server)', () => {
  it('returns true at exactly 900 seconds', () => {
    expect(shouldAutoEnd(900)).toBe(true);
  });

  it('returns true when exceeds 900 seconds', () => {
    expect(shouldAutoEnd(1000)).toBe(true);
  });

  it('returns false at 899 seconds', () => {
    expect(shouldAutoEnd(899)).toBe(false);
  });

  it('returns false at 0 seconds', () => {
    expect(shouldAutoEnd(0)).toBe(false);
  });
});

describe('checkSilenceTimeout (server)', () => {
  it('returns null when silenceStartedAt is null', () => {
    expect(checkSilenceTimeout(null, Date.now(), 30)).toBeNull();
  });

  it('returns result with shouldEnd=false when below timeout', () => {
    const now = Date.now();
    const silenceStartedAt = now - 5000; // 5 seconds
    const result = checkSilenceTimeout(silenceStartedAt, now, 10);

    expect(result).not.toBeNull();
    expect(result!.shouldEnd).toBe(false);
    expect(result!.silenceSeconds).toBeCloseTo(5, 0);
  });

  it('returns result with shouldEnd=true when exceeds timeout', () => {
    const now = Date.now();
    const silenceStartedAt = now - 36000; // 36 seconds
    const result = checkSilenceTimeout(silenceStartedAt, now, 35);

    expect(result).not.toBeNull();
    expect(result!.shouldEnd).toBe(true);
    expect(result!.silenceSeconds).toBeGreaterThanOrEqual(35);
  });

  it('returns shouldEnd=true at exactly timeout boundary', () => {
    const now = Date.now();
    const silenceStartedAt = now - 35000; // exactly 35 seconds
    const result = checkSilenceTimeout(silenceStartedAt, now, 35);

    expect(result).not.toBeNull();
    expect(result!.shouldEnd).toBe(true);
  });

  it('calculates silenceSeconds accurately', () => {
    const now = 10000;
    const silenceStartedAt = 7500; // 2.5 seconds ago
    const result = checkSilenceTimeout(silenceStartedAt, now, 30);

    expect(result).not.toBeNull();
    expect(result!.silenceSeconds).toBeCloseTo(2.5, 1);
  });
});

describe('formatTranscriptForCheckpoint (server)', () => {
  it('serializes transcript entries to JSON string', () => {
    const transcript = [
      { speaker: 'ai' as const, text: 'Hello there', timestamp: 1000 },
      { speaker: 'user' as const, text: 'Hi!', timestamp: 2000 },
    ];
    const result = formatTranscriptForCheckpoint(transcript);
    const parsed = JSON.parse(result);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ speaker: 'ai', text: 'Hello there', timestamp: 1000 });
    expect(parsed[1]).toEqual({ speaker: 'user', text: 'Hi!', timestamp: 2000 });
  });

  it('returns empty JSON array for empty transcript', () => {
    const result = formatTranscriptForCheckpoint([]);
    expect(JSON.parse(result)).toEqual([]);
  });

  it('preserves all fields in each entry', () => {
    const transcript = [
      { speaker: 'ai-transcription' as const, text: 'Some text', timestamp: 9999 },
    ];
    const result = formatTranscriptForCheckpoint(transcript);
    const parsed = JSON.parse(result);

    expect(parsed[0].speaker).toBe('ai-transcription');
    expect(parsed[0].text).toBe('Some text');
    expect(parsed[0].timestamp).toBe(9999);
  });

  it('returns a valid JSON string', () => {
    const transcript = [{ speaker: 'ai' as const, text: 'Test', timestamp: 500 }];
    const result = formatTranscriptForCheckpoint(transcript);

    expect(() => JSON.parse(result)).not.toThrow();
  });
});
