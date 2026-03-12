/** Maximum interview duration in seconds (15 minutes) */
export const MAX_INTERVIEW_DURATION_SECONDS = 900;

/** Warning threshold in seconds (12 minutes) */
export const INTERVIEW_WARNING_SECONDS = 720;

/** Silence timeout in seconds — auto-end after this duration */
export const SILENCE_TIMEOUT_SECONDS = 35;

/** RMS silence threshold — values below this are considered silence */
export const RMS_SILENCE_THRESHOLD = 0.05;

/** Transcript checkpoint interval in milliseconds (30 seconds) */
export const TRANSCRIPT_CHECKPOINT_INTERVAL_MS = 30_000;

/** Timeout for Gemini Live API connection handshake (ms) */
export const GEMINI_CONNECT_TIMEOUT_MS = 20_000;

/** Time after last AI audio chunk before user-turn silence tracking starts (ms) */
export const AUDIO_DRAIN_BUFFER_MS = 3_000;
