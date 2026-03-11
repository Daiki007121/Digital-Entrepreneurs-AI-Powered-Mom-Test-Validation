// Implements #6: Live Interview client view — orchestrates audio, WebSocket, transcript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAudioSession } from '@/lib/hooks/use-audio-session';
import { useRealtimeSession } from '@/lib/hooks/use-realtime-session';
import { useInterviewStore } from '@/lib/stores/interview-store';
import { TranscriptFeed } from './transcript-feed';
import { AiStatusIndicator } from './ai-status-indicator';
import { SessionTimer } from './session-timer';
import { SilenceIndicator } from './silence-indicator';
import { SessionControls } from './session-controls';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Spinner } from '@/components/ui/spinner';
import { POST_SESSION_NAV_DELAY_MS } from '@/lib/constants';
import type { TranscriptEntry } from '@/types';

interface LiveInterviewViewProps {
  interviewId: string;
  participantName: string;
  topic: string;
  targetUser: string;
  userId: string;
}

export function LiveInterviewView({
  interviewId,
  participantName,
  topic,
  targetUser,
  userId,
}: LiveInterviewViewProps) {
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const hasEndedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const store = useInterviewStore();
  const { startCapture, stopCapture, isMuted, toggleMute, playAudio, stopPlayback } =
    useAudioSession();
  const { connectionStatus, connect, disconnect, sendAudio, sendRms, sendTurnComplete } =
    useRealtimeSession();

  const handleEndSession = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    setIsEnding(true);
    stopPlayback();
    stopCapture();
    disconnect();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    toast.success('Interview ended. Analysis will begin shortly.');
    // TODO: Replace fixed delay — wait for the server's session_ended WS message before navigating
    setTimeout(() => {
      router.push('/dashboard');
    }, POST_SESSION_NAV_DELAY_MS);
  }, [stopPlayback, stopCapture, disconnect, router]);

  // Initialize session on mount
  useEffect(() => {
    store.setSession({ interviewId, participantName, topic, targetUser });
    startTimeRef.current = Date.now();

    // Duration timer
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      store.setElapsedSeconds(elapsed);
    }, 1000);

    // Start audio capture + WebSocket in parallel for fast initialization.
    // Keep spinner until server confirms Gemini is connected (session_started).
    const init = async () => {
      const actualSampleRate = await startCapture({
        onAudioData: (base64) => sendAudio(base64),
        onRmsValue: (rms) => sendRms(rms),
        onSilenceTimeout: () => sendTurnComplete(),
      });

      if (!actualSampleRate) {
        setIsInitializing(false);
        return;
      }

      connect(
        { interviewId, topic, targetUser, userId, sampleRate: actualSampleRate },
        {
          onAudio: (base64) => {
            playAudio(base64);
            store.setAiState('speaking');
          },
          onTranscript: (entry: TranscriptEntry) => {
            store.addTranscriptEntry(entry);
            store.setAiState('listening');
          },
          onUserTranscript: (entry: TranscriptEntry) => {
            store.addTranscriptEntry(entry);
          },
          onTurnComplete: () => {
            store.setAiState('listening');
          },
          onSessionStarted: () => {
            store.setIsRecording(true);
            setIsInitializing(false);
          },
          onWarning: (message: string) => {
            toast(message, { icon: '⏰' });
          },
          onSilenceDetected: (seconds: number) => {
            store.setSilenceSeconds(seconds);
          },
          onSessionEnded: () => {
            handleEndSession();
          },
          onError: (message: string) => {
            toast.error(message);
            // Unblock spinner if session setup fails (e.g. Gemini connection error)
            setIsInitializing(false);
          },
        },
      );
    };

    init();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Release microphone on unmount
      stopCapture();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Spinner size="lg" />
        <p className="text-[var(--text-secondary)] font-body text-sm">
          Setting up interview session...
        </p>
      </div>
    );
  }

  if (isEnding) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Spinner size="lg" />
        <p className="text-[var(--text-secondary)] font-body text-sm">
          Ending session...
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 glass border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-4">
            <AiStatusIndicator state={store.aiState} />
          </div>
          <div className="flex items-center gap-3">
            <SilenceIndicator silenceSeconds={store.silenceSeconds} />
            <SessionTimer elapsedSeconds={store.elapsedSeconds} />
            <div
              className={`w-2 h-2 rounded-full ${connectionStatus === 'connected'
                ? 'bg-green-500'
                : connectionStatus === 'connecting'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500'
                }`}
              aria-label={`Connection: ${connectionStatus}`}
            />
          </div>
        </header>

        {/* Transcript */}
        <main className="flex-1 overflow-hidden">
          <TranscriptFeed
            transcript={store.transcript}
          />
        </main>

        {/* Footer controls */}
        <footer className="flex items-center justify-between px-6 py-3 glass border-t border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-muted)] font-body truncate max-w-[40%]">
            {participantName} — {topic}
          </p>
          <SessionControls
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onEndSession={handleEndSession}
          />
        </footer>
      </div>
    </ErrorBoundary>
  );
}
