/**
 * Tests for server/constants.ts — validates exported constant values
 */
import {
  MAX_INTERVIEW_DURATION_SECONDS,
  INTERVIEW_WARNING_SECONDS,
  SILENCE_TIMEOUT_SECONDS,
  RMS_SILENCE_THRESHOLD,
  TRANSCRIPT_CHECKPOINT_INTERVAL_MS,
  GEMINI_CONNECT_TIMEOUT_MS,
  AUDIO_DRAIN_BUFFER_MS,
} from '@/server/constants';

describe('server/constants', () => {
  it('MAX_INTERVIEW_DURATION_SECONDS is 900 (15 minutes)', () => {
    expect(MAX_INTERVIEW_DURATION_SECONDS).toBe(900);
  });

  it('INTERVIEW_WARNING_SECONDS is 720 (12 minutes)', () => {
    expect(INTERVIEW_WARNING_SECONDS).toBe(720);
  });

  it('SILENCE_TIMEOUT_SECONDS is 35', () => {
    expect(SILENCE_TIMEOUT_SECONDS).toBe(35);
  });

  it('RMS_SILENCE_THRESHOLD is 0.05', () => {
    expect(RMS_SILENCE_THRESHOLD).toBe(0.05);
  });

  it('TRANSCRIPT_CHECKPOINT_INTERVAL_MS is 30000', () => {
    expect(TRANSCRIPT_CHECKPOINT_INTERVAL_MS).toBe(30_000);
  });

  it('GEMINI_CONNECT_TIMEOUT_MS is 20000', () => {
    expect(GEMINI_CONNECT_TIMEOUT_MS).toBe(20_000);
  });

  it('AUDIO_DRAIN_BUFFER_MS is 3000', () => {
    expect(AUDIO_DRAIN_BUFFER_MS).toBe(3_000);
  });

  it('warning threshold is less than max duration', () => {
    expect(INTERVIEW_WARNING_SECONDS).toBeLessThan(MAX_INTERVIEW_DURATION_SECONDS);
  });

  it('RMS_SILENCE_THRESHOLD is between 0 and 1', () => {
    expect(RMS_SILENCE_THRESHOLD).toBeGreaterThan(0);
    expect(RMS_SILENCE_THRESHOLD).toBeLessThan(1);
  });
});
