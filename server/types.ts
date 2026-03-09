/** Configuration for a new interview session */
export interface SessionConfig {
  interviewId: string;
  topic: string;
  targetUser: string;
  userId: string;
}

/** Events forwarded from Gemini Live API */
export interface GeminiLiveEvent {
  type: 'audio' | 'transcript' | 'turn_complete' | 'interrupted' | 'error';
  data?: string;
  text?: string;
  error?: string;
}

/** Messages sent from relay server to client */
export interface ServerMessage {
  type:
    | 'audio'
    | 'transcript'
    | 'user_transcript'
    | 'turn_complete'
    | 'interrupted'
    | 'session_started'
    | 'session_ended'
    | 'warning'
    | 'silence_detected'
    | 'error';
  data?: string;
  text?: string;
  message?: string;
  elapsedSeconds?: number;
  silenceSeconds?: number;
}

/** Messages sent from client to relay server */
export interface ClientMessage {
  type: 'audio' | 'rms' | 'start_session' | 'end_session';
  data?: string;
  rms?: number;
  config?: SessionConfig;
}

/** A single transcript entry (server-side, mirrors frontend type) */
export interface TranscriptEntry {
  speaker: 'ai' | 'user' | 'ai-transcription';
  text: string;
  timestamp: number;
}

/** Tracked state for an active session */
export interface ActiveSession {
  interviewId: string;
  userId: string;
  topic: string;
  targetUser: string;
  transcript: TranscriptEntry[];
  startedAt: number;
  lastActivityAt: number;
  silenceStartedAt: number | null;
  /** True once AI has produced its first transcript — silence detection starts after this */
  aiReady: boolean;
  warningsSent: Set<string>;
  checkpointTimer: ReturnType<typeof setInterval> | null;
  durationTimer: ReturnType<typeof setInterval> | null;
}
