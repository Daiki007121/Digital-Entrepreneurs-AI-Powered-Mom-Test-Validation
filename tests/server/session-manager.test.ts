/**
 * Session Manager tests
 * Tests duration tracking, silence detection, transcript management
 */

// We test the pure logic functions extracted from SessionManager
// to avoid needing real WebSocket/Gemini connections

import {
  shouldWarn,
  shouldAutoEnd,
  checkSilenceTimeout,
  formatTranscriptForCheckpoint,
} from '@/lib/session-logic';

describe('shouldWarn', () => {
  it('returns true when elapsed reaches warning threshold (720s)', () => {
    expect(shouldWarn(720, new Set())).toBe(true);
  });

  it('returns true when elapsed exceeds warning threshold', () => {
    expect(shouldWarn(750, new Set())).toBe(true);
  });

  it('returns false when below warning threshold', () => {
    expect(shouldWarn(600, new Set())).toBe(false);
  });

  it('returns false when warning already sent', () => {
    expect(shouldWarn(720, new Set(['duration_warning']))).toBe(false);
  });
});

describe('shouldAutoEnd', () => {
  it('returns true when elapsed reaches max duration (900s)', () => {
    expect(shouldAutoEnd(900)).toBe(true);
  });

  it('returns true when elapsed exceeds max duration', () => {
    expect(shouldAutoEnd(950)).toBe(true);
  });

  it('returns false when below max duration', () => {
    expect(shouldAutoEnd(899)).toBe(false);
  });
});

describe('checkSilenceTimeout', () => {
  const SILENCE_TIMEOUT_SECONDS = 10;

  it('returns null when no silence detected (silenceStartedAt is null)', () => {
    const result = checkSilenceTimeout(null, Date.now(), SILENCE_TIMEOUT_SECONDS);
    expect(result).toBeNull();
  });

  it('returns silence duration when below timeout', () => {
    const now = Date.now();
    const silenceStartedAt = now - 5000; // 5 seconds ago
    const result = checkSilenceTimeout(silenceStartedAt, now, SILENCE_TIMEOUT_SECONDS);
    expect(result).not.toBeNull();
    expect(result!.shouldEnd).toBe(false);
    expect(result!.silenceSeconds).toBeCloseTo(5, 0);
  });

  it('returns shouldEnd=true when silence exceeds timeout', () => {
    const now = Date.now();
    const silenceStartedAt = now - 11000; // 11 seconds ago
    const result = checkSilenceTimeout(silenceStartedAt, now, SILENCE_TIMEOUT_SECONDS);
    expect(result).not.toBeNull();
    expect(result!.shouldEnd).toBe(true);
    expect(result!.silenceSeconds).toBeGreaterThanOrEqual(10);
  });

  it('returns shouldEnd=true at exactly timeout', () => {
    const now = Date.now();
    const silenceStartedAt = now - 10000; // exactly 10 seconds ago
    const result = checkSilenceTimeout(silenceStartedAt, now, SILENCE_TIMEOUT_SECONDS);
    expect(result).not.toBeNull();
    expect(result!.shouldEnd).toBe(true);
  });
});

describe('formatTranscriptForCheckpoint', () => {
  it('returns JSON array of transcript entries', () => {
    const transcript = [
      { speaker: 'ai' as const, text: 'Hello', timestamp: 1000 },
      { speaker: 'user' as const, text: 'Hi there', timestamp: 2000 },
    ];
    const result = formatTranscriptForCheckpoint(transcript);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].speaker).toBe('ai');
    expect(parsed[1].text).toBe('Hi there');
  });

  it('returns empty array for empty transcript', () => {
    const result = formatTranscriptForCheckpoint([]);
    expect(JSON.parse(result)).toEqual([]);
  });
});
