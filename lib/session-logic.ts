import {
  INTERVIEW_WARNING_SECONDS,
  MAX_INTERVIEW_DURATION_SECONDS,
} from '@/lib/constants';

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: number;
}

interface SilenceCheckResult {
  shouldEnd: boolean;
  silenceSeconds: number;
}

/**
 * Determines if a duration warning should be sent to the client.
 * @param elapsedSeconds - Seconds since interview started
 * @param warningsSent - Set of warnings already sent
 * @returns true if warning should be sent
 */
export function shouldWarn(
  elapsedSeconds: number,
  warningsSent: Set<string>,
): boolean {
  return (
    elapsedSeconds >= INTERVIEW_WARNING_SECONDS &&
    !warningsSent.has('duration_warning')
  );
}

/**
 * Determines if the interview should auto-end due to exceeding max duration.
 * @param elapsedSeconds - Seconds since interview started
 * @returns true if interview should be ended
 */
export function shouldAutoEnd(elapsedSeconds: number): boolean {
  return elapsedSeconds >= MAX_INTERVIEW_DURATION_SECONDS;
}

/**
 * Checks if continuous silence has exceeded the timeout.
 * @param silenceStartedAt - Timestamp when silence began, or null
 * @param now - Current timestamp
 * @param timeoutSeconds - Silence timeout in seconds
 * @returns null if no silence tracking, or result with shouldEnd flag
 */
export function checkSilenceTimeout(
  silenceStartedAt: number | null,
  now: number,
  timeoutSeconds: number,
): SilenceCheckResult | null {
  if (silenceStartedAt === null) {
    return null;
  }

  const silenceSeconds = (now - silenceStartedAt) / 1000;
  return {
    shouldEnd: silenceSeconds >= timeoutSeconds,
    silenceSeconds,
  };
}

/**
 * Serializes transcript entries to JSON for Supabase checkpoint.
 * @param transcript - Array of transcript entries
 * @returns JSON string
 */
export function formatTranscriptForCheckpoint(
  transcript: TranscriptEntry[],
): string {
  return JSON.stringify(transcript);
}
