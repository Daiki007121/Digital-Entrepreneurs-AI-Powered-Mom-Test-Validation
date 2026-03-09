/** Interview status values */
export const INTERVIEW_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ANALYZED: 'analyzed',
} as const;

export type InterviewStatus = (typeof INTERVIEW_STATUS)[keyof typeof INTERVIEW_STATUS];

/** Maximum interview duration in seconds (15 minutes) */
export const MAX_INTERVIEW_DURATION_SECONDS = 900;

/** Warning threshold in seconds (12 minutes) */
export const INTERVIEW_WARNING_SECONDS = 720;

/** Silence timeout in seconds — auto-end after this duration */
export const SILENCE_TIMEOUT_SECONDS = 35;

/** Transcript speaker identifiers */
export const TRANSCRIPT_SPEAKER = {
  AI: 'ai',
  USER: 'user',
  AI_TRANSCRIPTION: 'ai-transcription',
} as const;

export type TranscriptSpeaker = (typeof TRANSCRIPT_SPEAKER)[keyof typeof TRANSCRIPT_SPEAKER];

/** WebSocket reconnection max retries */
export const WS_RECONNECT_MAX_RETRIES = 5;

/** RMS silence threshold — values below this are considered silence */
export const RMS_SILENCE_THRESHOLD = 0.01;

/** Transcript checkpoint interval in milliseconds (30 seconds) */
export const TRANSCRIPT_CHECKPOINT_INTERVAL_MS = 30_000;

/** Delay before closing WebSocket after sending end_session (ms) */
export const WS_CLOSE_DELAY_MS = 500;

/** Delay before navigating to dashboard after session ends (ms) */
export const POST_SESSION_NAV_DELAY_MS = 2000;

