// Implements #3: Gemini Live API relay — bridges client WebSocket to Gemini
import { GoogleGenAI, Modality, type Session } from '@google/genai';
import { WebSocket } from 'ws';
import type { ServerMessage, TranscriptEntry } from './types.js';

const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-latest';

export interface GeminiRelayCallbacks {
  onTranscript: (entry: TranscriptEntry) => void;
  onTurnComplete: () => void;
  onError: (error: string) => void;
  /** Called each time an audio chunk is sent to the client */
  onAudioSent?: () => void;
}

/**
 * Manages a single Gemini Live API session, forwarding audio between
 * a client WebSocket and Gemini.
 */
export class GeminiRelay {
  private session: Session | null = null;
  private ws: WebSocket;
  private callbacks: GeminiRelayCallbacks;
  private closed = false;
  /** Buffer for accumulating AI output transcription fragments */
  private aiTranscriptBuffer = '';
  /** Buffer for accumulating user input transcription fragments */
  private userTranscriptBuffer = '';
  /** Debounce timer for flushing user transcript after turnComplete */
  private userFlushTimerRef: ReturnType<typeof setTimeout> | null = null;
  /** True once flush has been authorised (client_turn_complete or Gemini turnComplete).
   *  Cleared only after an actual flush so late-arriving deltas still coalesce. */
  private userFlushPending = false;
  private sampleRate: number;

  constructor(ws: WebSocket, callbacks: GeminiRelayCallbacks, sampleRate: number) {
    this.ws = ws;
    this.callbacks = callbacks;
    this.sampleRate = sampleRate;
  }

  /**
   * Connects to the Gemini Live API and begins forwarding events.
   * @param systemInstruction - The Mom Test system prompt
   */
  async connect(systemInstruction: string): Promise<void> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not set');
    }

    const ai = new GoogleGenAI({ apiKey });

    this.session = await ai.live.connect({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Aoede' },
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {
          console.log('[GeminiRelay] Connected to Gemini Live API');
        },
        onmessage: (message: unknown) => {
          if (this.closed) return;
          this.handleGeminiMessage(message);
        },
        onerror: (error: unknown) => {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error('[GeminiRelay] Error:', errMsg);
          this.callbacks.onError(errMsg);
        },
        onclose: () => {
          console.log('[GeminiRelay] Gemini session closed');
          this.closed = true;
        },
      },
    });

    // Trigger AI to speak first — must be after ai.live.connect() resolves
    // so this.session is assigned
    this.session.sendClientContent({
      turns: [
        {
          role: 'user',
          parts: [{ text: 'Please begin the interview. Introduce yourself and start with your opening question.' }],
        },
      ],
      turnComplete: true,
    });
  }

  /**
   * Sends PCM16 audio data to Gemini.
   * @param base64Audio - Base64-encoded PCM16 audio data
   */
  sendAudio(base64Audio: string): void {
    if (!this.session || this.closed) return;
    try {
      this.session.sendRealtimeInput({
        audio: {
          data: base64Audio,
          mimeType: `audio/pcm;rate=${this.sampleRate}`,
        },
      });
    } catch (err) {
      console.error('[GeminiRelay] Error sending audio:', err);
    }
  }

  /**
   * Explictly signals to Gemini that the user has stopped speaking via a clientContent message.
   * This forces the VAD to stop waiting and generate a response immediately.
   */
  sendTurnComplete(): void {
    if (!this.session || this.closed) return;
    try {
      this.session.sendClientContent({ turns: [], turnComplete: true });
    } catch (err) {
      console.error('[GeminiRelay] Error sending turn complete:', err);
    }
  }

  /**
   * Processes messages received from Gemini Live API.
   */
  private handleGeminiMessage(message: unknown): void {
    const msg = message as Record<string, unknown>;

    // Handle audio response data
    const serverContent = msg.serverContent as Record<string, unknown> | undefined;
    if (serverContent) {
      const modelTurn = serverContent.modelTurn as Record<string, unknown> | undefined;
      if (modelTurn) {
        const parts = modelTurn.parts as Array<Record<string, unknown>> | undefined;
        if (parts) {
          for (const part of parts) {
            const inlineData = part.inlineData as Record<string, unknown> | undefined;
            if (inlineData?.data) {
              this.sendToClient({
                type: 'audio',
                data: inlineData.data as string,
              });
              this.callbacks.onAudioSent?.();
            }
          }
        }
      }

      // Handle output audio transcription (AI speech text) — accumulate into buffer
      const outputTranscription = serverContent.outputTranscription as
        | Record<string, unknown>
        | undefined;
      if (outputTranscription?.text) {
        this.aiTranscriptBuffer += outputTranscription.text as string;
      }

      // Handle input audio transcription (user speech text from Gemini)
      // inputTranscription sends incremental deltas (like outputTranscription),
      // so we append rather than replace to accumulate the full sentence.
      // Always reschedule flush on each delta — Gemini may send deltas late (after
      // it starts generating its response), so we can't rely on triggerUserTranscriptFlush()
      // having pre-populated the buffer. APPEND + 1000ms debounce coalesces all deltas
      // into one sentence entry regardless of when they arrive.
      const inputTranscription = serverContent.inputTranscription as
        | Record<string, unknown>
        | undefined;
      if (inputTranscription?.text) {
        this.userTranscriptBuffer += inputTranscription.text as string;
        // Only reschedule if flush has already been authorised — prevents premature
        // word-by-word flushes when deltas arrive more than 1000ms apart.
        if (this.userFlushPending) {
          this.scheduleUserTranscriptFlush();
        }
      }

      // Handle turn complete — flush AI transcript immediately, debounce user transcript
      if (serverContent.turnComplete) {
        this.flushAiTranscriptBuffer();
        this.userFlushPending = true;
        this.scheduleUserTranscriptFlush();
        this.sendToClient({ type: 'turn_complete' });
        this.callbacks.onTurnComplete();
      }

      // Handle interruption — flush whatever we have so far
      if (serverContent.interrupted) {
        this.flushAiTranscriptBuffer();
        this.userFlushPending = true;
        this.scheduleUserTranscriptFlush();
        this.sendToClient({ type: 'interrupted' });
        this.callbacks.onTurnComplete();
      }
    }
  }

  /** Flushes accumulated AI transcript buffer as a complete message */
  private flushAiTranscriptBuffer(): void {
    if (this.aiTranscriptBuffer.trim()) {
      const text = this.aiTranscriptBuffer.trim();
      this.sendToClient({ type: 'transcript', text });
      this.callbacks.onTranscript({ speaker: 'ai-transcription', text, timestamp: Date.now() });
      this.aiTranscriptBuffer = '';
    }
  }

  /** Flushes accumulated user transcript buffer as a complete message */
  private flushUserTranscriptBuffer(): void {
    if (this.userTranscriptBuffer.trim()) {
      const text = this.userTranscriptBuffer.trim();
      this.sendToClient({ type: 'user_transcript', text });
      this.callbacks.onTranscript({ speaker: 'user', text, timestamp: Date.now() });
      this.userTranscriptBuffer = '';
      this.userFlushPending = false; // clear only after a real flush
    }
  }

  /**
   * Called by SessionManager when client signals end of user turn (client_turn_complete).
   * Schedules a prompt flush so user transcript appears ~2.5s after user stops speaking,
   * independent of Gemini response latency.
   */
  triggerUserTranscriptFlush(): void {
    this.userFlushPending = true;
    this.scheduleUserTranscriptFlush();
  }

  /**
   * Schedules a debounced flush of the user transcript buffer (3000ms).
   * Resets the timer if called again before it fires, allowing late
   * inputTranscription updates from Gemini to be captured.
   */
  private scheduleUserTranscriptFlush(): void {
    if (this.userFlushTimerRef) clearTimeout(this.userFlushTimerRef);
    this.userFlushTimerRef = setTimeout(() => {
      this.flushUserTranscriptBuffer();
      this.userFlushTimerRef = null;
    }, 3000);
  }

  /** Send a message to the client WebSocket */
  private sendToClient(msg: ServerMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /** Close the Gemini session */
  async close(): Promise<void> {
    // Cancel any pending debounce and flush immediately
    if (this.userFlushTimerRef) {
      clearTimeout(this.userFlushTimerRef);
      this.userFlushTimerRef = null;
    }
    this.flushAiTranscriptBuffer();
    this.userFlushPending = true;
    this.flushUserTranscriptBuffer();
    this.closed = true;
    if (this.session) {
      try {
        this.session.close();
      } catch {
        // Session may already be closed
      }
      this.session = null;
    }
  }
}
