// Implements #3: Session management for interview WebSocket connections
import type { WebSocket } from 'ws';
import type {
  SessionConfig,
  ServerMessage,
  ActiveSession,
  TranscriptEntry,
} from './types.js';
import { GeminiRelay } from './gemini-relay.js';
import {
  SILENCE_TIMEOUT_SECONDS,
  RMS_SILENCE_THRESHOLD,
  TRANSCRIPT_CHECKPOINT_INTERVAL_MS,
} from './constants.js';
import {
  shouldWarn,
  shouldAutoEnd,
  checkSilenceTimeout,
  formatTranscriptForCheckpoint,
} from './session-logic.js';

/** Maps client WebSocket connections to their active sessions + relays */
interface SessionEntry {
  session: ActiveSession;
  relay: GeminiRelay;
}

/**
 * Manages active interview sessions — tracks duration, silence,
 * transcript checkpoints, and coordinates Gemini relay connections.
 */
export class SessionManager {
  private sessions = new Map<WebSocket, SessionEntry>();

  /**
   * Creates a new interview session and connects to Gemini.
   */
  async createSession(ws: WebSocket, config: SessionConfig): Promise<void> {
    // Prevent duplicate sessions
    if (this.sessions.has(ws)) {
      await this.endSession(ws);
    }

    const now = Date.now();
    const session: ActiveSession = {
      interviewId: config.interviewId,
      userId: config.userId,
      topic: config.topic,
      targetUser: config.targetUser,
      transcript: [],
      startedAt: now,
      lastActivityAt: now,
      silenceStartedAt: null,
      aiReady: false,
      isUserTurn: false,
      warningsSent: new Set(),
      checkpointTimer: null,
      durationTimer: null,
    };

    const relay = new GeminiRelay(
      ws,
      {
        onTranscript: (entry: TranscriptEntry) => {
          session.transcript.push(entry);
          session.lastActivityAt = Date.now();
          session.silenceStartedAt = null; // Reset silence on transcript activity
          if (!session.aiReady) session.aiReady = true;
        },
        onTurnComplete: () => {
          // AI finished speaking. Now it is the user's turn.
          session.isUserTurn = true;
          session.silenceStartedAt = null;
        },
        onError: (error: string) => {
          console.error(`[SessionManager] Gemini error for ${config.interviewId}:`, error);
          this.sendToClient(ws, { type: 'error', message: `Gemini error: ${error}` });
        },
      },
      config.sampleRate || 24000
    );

    // Build Mom Test system instruction
    const { buildInterviewPrompt } = await import('./prompt-bridge.js');
    const systemInstruction = buildInterviewPrompt(config.topic, config.targetUser);

    try {
      await relay.connect(systemInstruction);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to Gemini';
      this.sendToClient(ws, { type: 'error', message: msg });
      return;
    }

    // Start duration tracking (every second)
    session.durationTimer = setInterval(() => {
      this.checkDuration(ws);
    }, 1000);

    // Start transcript checkpoint (every 30s)
    session.checkpointTimer = setInterval(() => {
      this.saveCheckpoint(ws);
    }, TRANSCRIPT_CHECKPOINT_INTERVAL_MS);

    this.sessions.set(ws, { session, relay });

    this.sendToClient(ws, {
      type: 'session_started',
      message: `Session ${config.interviewId} started`,
    });

    console.log(`[SessionManager] Session created: ${config.interviewId}`);
  }

  /**
   * Forwards audio data to the Gemini relay.
   */
  handleAudio(ws: WebSocket, base64Audio: string): void {
    const entry = this.sessions.get(ws);
    if (!entry) return;

    entry.session.lastActivityAt = Date.now();
    entry.relay.sendAudio(base64Audio);
  }

  /**
   * Forwards a manual turn complete signal to the Gemini relay.
   */
  handleTurnComplete(ws: WebSocket): void {
    const entry = this.sessions.get(ws);
    if (!entry) return;

    entry.session.lastActivityAt = Date.now();
    // Reset silence timer since user concluded turn and we are waiting for AI
    entry.session.isUserTurn = false;
    entry.session.silenceStartedAt = null;
    entry.relay.sendTurnComplete();
  }

  /**
   * Handles RMS (volume) values for silence detection.
   */
  handleRms(ws: WebSocket, rms: number): void {
    const entry = this.sessions.get(ws);
    if (!entry) return;

    const { session } = entry;

    // Don't track silence until AI has spoken at least once, and only during user's turn
    if (!session.aiReady || !session.isUserTurn) {
      session.silenceStartedAt = null; // clear any errant silence timer
      return;
    }

    const now = Date.now();

    if (rms < RMS_SILENCE_THRESHOLD) {
      // Below threshold — silence
      if (session.silenceStartedAt === null) {
        session.silenceStartedAt = now;
      }

      const silenceResult = checkSilenceTimeout(
        session.silenceStartedAt,
        now,
        SILENCE_TIMEOUT_SECONDS,
      );

      if (silenceResult) {
        if (silenceResult.shouldEnd) {
          this.sendToClient(ws, {
            type: 'silence_detected',
            message: 'Auto-ending due to extended silence',
            silenceSeconds: silenceResult.silenceSeconds,
          });
          void this.endSession(ws);
        } else if (silenceResult.silenceSeconds >= 5) {
          // Warn client about ongoing silence (after 5s)
          this.sendToClient(ws, {
            type: 'silence_detected',
            silenceSeconds: silenceResult.silenceSeconds,
          });
        }
      }
    } else {
      // Above threshold — speaking
      session.silenceStartedAt = null;
    }
  }

  /**
   * Ends a session, saves final transcript, and cleans up.
   * Removes session from map immediately to prevent double-call race conditions.
   */
  async endSession(ws: WebSocket): Promise<void> {
    const entry = this.sessions.get(ws);
    if (!entry) return;

    // Remove from map immediately to prevent concurrent calls
    this.sessions.delete(ws);

    const { session, relay } = entry;

    console.trace(`[SessionManager] endSession called for: ${session.interviewId}`);

    // Clear timers
    if (session.checkpointTimer) clearInterval(session.checkpointTimer);
    if (session.durationTimer) clearInterval(session.durationTimer);

    // Close Gemini connection
    await relay.close();

    // Calculate duration
    const durationSeconds = Math.round((Date.now() - session.startedAt) / 1000);

    // Save final transcript + auto-trigger analysis
    await this.saveFinalTranscript(session, durationSeconds);

    this.sendToClient(ws, {
      type: 'session_ended',
      message: 'Interview session ended',
      elapsedSeconds: durationSeconds,
    });

    console.log(
      `[SessionManager] Session ended: ${session.interviewId} (${durationSeconds}s)`,
    );
  }

  /**
   * Handles client disconnect — cleans up the session.
   */
  handleDisconnect(ws: WebSocket): void {
    void this.endSession(ws);
  }

  /**
   * Closes all active sessions (used during server shutdown).
   */
  closeAll(): void {
    for (const [ws] of this.sessions) {
      void this.endSession(ws);
    }
  }

  /** Checks interview duration and sends warnings or auto-ends */
  private checkDuration(ws: WebSocket): void {
    const entry = this.sessions.get(ws);
    if (!entry) return;

    const { session } = entry;
    const elapsedSeconds = Math.round((Date.now() - session.startedAt) / 1000);

    if (shouldAutoEnd(elapsedSeconds)) {
      this.sendToClient(ws, {
        type: 'warning',
        message: 'Interview auto-ending — maximum duration reached',
        elapsedSeconds,
      });
      void this.endSession(ws);
      return;
    }

    if (shouldWarn(elapsedSeconds, session.warningsSent)) {
      session.warningsSent.add('duration_warning');
      this.sendToClient(ws, {
        type: 'warning',
        message: 'Interview approaching time limit (12 minutes)',
        elapsedSeconds,
      });
    }
  }

  /** Saves a transcript checkpoint to Supabase */
  private async saveCheckpoint(ws: WebSocket): Promise<void> {
    const entry = this.sessions.get(ws);
    if (!entry) return;

    const { session } = entry;
    const transcriptJson = formatTranscriptForCheckpoint(session.transcript);

    try {
      // Dynamic import to avoid circular dependency issues
      const { updateTranscript } = await import('./supabase-ops.js');
      await updateTranscript(session.interviewId, transcriptJson);
      console.log(
        `[SessionManager] Checkpoint saved: ${session.interviewId} (${session.transcript.length} entries)`,
      );
    } catch (err) {
      console.error('[SessionManager] Checkpoint save failed:', err);
    }
  }

  /** Saves final transcript, updates interview status, then auto-triggers analysis */
  private async saveFinalTranscript(
    session: ActiveSession,
    durationSeconds: number,
  ): Promise<void> {
    const transcriptJson = formatTranscriptForCheckpoint(session.transcript);

    try {
      const { completeInterview } = await import('./supabase-ops.js');
      await completeInterview(session.interviewId, transcriptJson, durationSeconds);
      console.log(
        `[SessionManager] Final transcript saved: ${session.interviewId}`,
      );
    } catch (err) {
      console.error('[SessionManager] Final save failed:', err);
      return; // Don't trigger analysis if save failed
    }

    // Auto-trigger analysis pipeline (fire-and-forget, don't block session end)
    try {
      const { analyzeTranscript } = await import('./analysis.js');
      console.log(`[SessionManager] Starting analysis for: ${session.interviewId}`);
      analyzeTranscript(session.interviewId)
        .then(() => console.log(`[SessionManager] Analysis complete: ${session.interviewId}`))
        .catch((err: unknown) => console.error('[SessionManager] Analysis failed:', err));
    } catch (err) {
      console.error('[SessionManager] Failed to start analysis:', err);
    }
  }

  /** Sends a message to a client WebSocket */
  private sendToClient(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === 1) {
      // WebSocket.OPEN
      ws.send(JSON.stringify(msg));
    }
  }
}
