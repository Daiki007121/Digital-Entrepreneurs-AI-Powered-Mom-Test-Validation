// Implements #6: WebSocket hook for relay server communication
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_RECONNECT_MAX_RETRIES, WS_CLOSE_DELAY_MS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import type { TranscriptEntry } from '@/types';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface ServerMessage {
  type: string;
  data?: string;
  text?: string;
  message?: string;
  elapsedSeconds?: number;
  silenceSeconds?: number;
}

interface SessionConfig {
  interviewId: string;
  topic: string;
  targetUser: string;
  userId: string;
  sampleRate: number;
}

interface RealtimeSessionCallbacks {
  onAudio: (base64Audio: string) => void;
  onTranscript: (entry: TranscriptEntry) => void;
  onUserTranscript: (entry: TranscriptEntry) => void;
  onTurnComplete: () => void;
  onSessionStarted: () => void;
  onWarning: (message: string) => void;
  onSilenceDetected: (seconds: number) => void;
  onSessionEnded: () => void;
  onError: (message: string) => void;
}

interface RealtimeSessionReturn {
  connectionStatus: ConnectionStatus;
  connect: (config: SessionConfig, callbacks: RealtimeSessionCallbacks) => void;
  disconnect: () => void;
  sendAudio: (base64Audio: string) => void;
  sendRms: (rms: number) => void;
  sendTurnComplete: () => void;
}

const RELAY_URL = process.env.NEXT_PUBLIC_RELAY_SERVER_URL || 'ws://localhost:8081';

/**
 * Hook for managing WebSocket connection to the relay server.
 * Handles auto-reconnect with exponential backoff.
 */
export function useRealtimeSession(): RealtimeSessionReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef<RealtimeSessionCallbacks | null>(null);
  const configRef = useRef<SessionConfig | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);

  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      if (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    cleanup();
    setConnectionStatus('connecting');

    const ws = new WebSocket(`${RELAY_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      retryCountRef.current = 0;

      // Send start_session message
      if (configRef.current) {
        ws.send(
          JSON.stringify({
            type: 'start_session',
            config: configRef.current,
          }),
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        logger.debug('[RealtimeSession] Received message:', msg.type);

        const cb = callbacksRef.current;
        if (!cb) return;

        switch (msg.type) {
          case 'audio':
            if (msg.data) cb.onAudio(msg.data);
            break;
          case 'transcript':
            if (msg.text) {
              cb.onTranscript({
                speaker: 'ai-transcription',
                text: msg.text,
                timestamp: Date.now(),
              });
            }
            break;
          case 'user_transcript':
            if (msg.text) {
              cb.onUserTranscript({
                speaker: 'user',
                text: msg.text,
                timestamp: Date.now(),
              });
            }
            break;
          case 'turn_complete':
            cb.onTurnComplete();
            break;
          case 'interrupted':
            cb.onTurnComplete();
            break;
          case 'session_started':
            cb.onSessionStarted();
            break;
          case 'session_ended':
            cb.onSessionEnded();
            break;
          case 'warning':
            if (msg.message) cb.onWarning(msg.message);
            break;
          case 'silence_detected':
            if (msg.silenceSeconds != null) cb.onSilenceDetected(msg.silenceSeconds);
            break;
          case 'error':
            if (msg.message) cb.onError(msg.message);
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (intentionalCloseRef.current) {
        setConnectionStatus('disconnected');
        return;
      }

      // Auto-reconnect with exponential backoff
      if (retryCountRef.current < WS_RECONNECT_MAX_RETRIES) {
        const delay = Math.pow(2, retryCountRef.current) * 1000; // 1s, 2s, 4s, 8s, 16s
        retryCountRef.current++;
        setConnectionStatus('connecting');
        retryTimeoutRef.current = setTimeout(connectWebSocket, delay);
      } else {
        setConnectionStatus('error');
        callbacksRef.current?.onError(
          'Connection lost. Please refresh the page to reconnect.',
        );
      }
    };

    ws.onerror = () => {
      // onclose will fire after this
    };
  }, [cleanup]);

  const connect = useCallback(
    (config: SessionConfig, callbacks: RealtimeSessionCallbacks) => {
      configRef.current = config;
      callbacksRef.current = callbacks;
      intentionalCloseRef.current = false;
      retryCountRef.current = 0;
      connectWebSocket();
    },
    [connectWebSocket],
  );

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_session' }));
      // Let the server process end_session before closing the WebSocket
      // The server needs time to save transcript and trigger analysis
      const ws = wsRef.current;
      closeTimeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
        closeTimeoutRef.current = null;
      }, WS_CLOSE_DELAY_MS);
      wsRef.current = null;
    }
    // Clear retry timer but don't force-close WS yet
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  const sendAudio = useCallback((base64Audio: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'audio', data: base64Audio }));
    }
  }, []);

  const sendRms = useCallback((rms: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'rms', rms }));
    }
  }, []);

  const sendTurnComplete = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'client_turn_complete' }));
    }
  }, []);

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  return { connectionStatus, connect, disconnect, sendAudio, sendRms, sendTurnComplete };
}
