// Implements #3: Gemini Live API relay — bridges client WebSocket to Gemini
import { GoogleGenAI, Modality, type Session } from '@google/genai';
import type { WebSocket } from 'ws';
import type { ServerMessage, TranscriptEntry } from './types.js';

const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-latest';

export interface GeminiRelayCallbacks {
  onTranscript: (entry: TranscriptEntry) => void;
  onError: (error: string) => void;
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

  constructor(ws: WebSocket, callbacks: GeminiRelayCallbacks) {
    this.ws = ws;
    this.callbacks = callbacks;
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
          mimeType: 'audio/pcm;rate=24000',
        },
      });
    } catch (err) {
      console.error('[GeminiRelay] Error sending audio:', err);
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
            }
          }
        }
      }

      // Handle turn complete
      if (serverContent.turnComplete) {
        this.sendToClient({ type: 'turn_complete' });
      }

      // Handle interruption
      if (serverContent.interrupted) {
        this.sendToClient({ type: 'interrupted' });
      }

      // Handle output audio transcription (AI speech text)
      const outputTranscription = serverContent.outputTranscription as
        | Record<string, unknown>
        | undefined;
      if (outputTranscription?.text) {
        const text = outputTranscription.text as string;
        this.sendToClient({ type: 'transcript', text });
        this.callbacks.onTranscript({
          speaker: 'ai-transcription',
          text,
          timestamp: Date.now(),
        });
      }

      // Handle input audio transcription (user speech text from Gemini)
      const inputTranscription = serverContent.inputTranscription as
        | Record<string, unknown>
        | undefined;
      if (inputTranscription?.text) {
        const text = inputTranscription.text as string;
        this.callbacks.onTranscript({
          speaker: 'user',
          text,
          timestamp: Date.now(),
        });
      }
    }
  }

  /** Send a message to the client WebSocket */
  private sendToClient(msg: ServerMessage): void {
    if (this.ws.readyState === 1) {
      // WebSocket.OPEN
      this.ws.send(JSON.stringify(msg));
    }
  }

  /** Close the Gemini session */
  async close(): Promise<void> {
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
