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
import { POST_SESSION_NAV_DELAY_MS, SESSION_START_TIMEOUT_MS } from '@/lib/constants';
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
  const [initStep, setInitStep] = useState<'mic' | 'connecting' | 'ai'>('mic');
  const hasEndedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const sessionStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializingRef = useRef(true);
  // Audio buffering: hold AI audio until user transcript is displayed
  const audioBufferRef = useRef<string[]>([]);
  const waitingForUserTranscriptRef = useRef(false);
  const audioReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const store = useInterviewStore();
  const { startCapture, stopCapture, isMuted, toggleMute, playAudio, stopPlayback } =
    useAudioSession();
  const { connectionStatus, connect, disconnect, sendAudio, sendRms, sendTurnComplete } =
    useRealtimeSession();

  // Releases buffered AI audio — called when user transcript arrives or after timeout
  const releaseAudioBuffer = useCallback(() => {
    if (audioReleaseTimerRef.current) {
      clearTimeout(audioReleaseTimerRef.current);
      audioReleaseTimerRef.current = null;
    }
    waitingForUserTranscriptRef.current = false;
    if (audioBufferRef.current.length > 0) {
      audioBufferRef.current.forEach((chunk) => playAudio(chunk));
      audioBufferRef.current = [];
      store.setAiState('speaking');
    }
  }, [playAudio, store]);

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
    // Use hard navigation to bypass Next.js router cache (stale RSC payload)
    // Toast is deferred to dashboard via sessionStorage so it survives the reload
    setTimeout(() => {
      sessionStorage.setItem('interview_just_ended', '1');
      window.location.replace('/dashboard');
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
      const clearInitTimeout = () => {
        if (sessionStartTimeoutRef.current) {
          clearTimeout(sessionStartTimeoutRef.current);
          sessionStartTimeoutRef.current = null;
        }
        isInitializingRef.current = false;
      };

      const actualSampleRate = await startCapture({
        onAudioData: (base64) => sendAudio(base64),
        onRmsValue: (rms) => sendRms(rms),
        onSilenceTimeout: () => {
          sendTurnComplete();
          store.setAiState('thinking');
          // Start buffering AI audio until user transcript is displayed
          waitingForUserTranscriptRef.current = true;
          audioBufferRef.current = [];
          // Fallback: release buffer after 3s if transcript never arrives
          audioReleaseTimerRef.current = setTimeout(releaseAudioBuffer, 3000);
        },
      });

      if (!actualSampleRate) {
        clearInitTimeout();
        setIsInitializing(false);
        return;
      }

      setInitStep('connecting');

      connect(
        { interviewId, topic, targetUser, userId, sampleRate: actualSampleRate },
        {
          onAudio: (base64) => {
            if (waitingForUserTranscriptRef.current) {
              // Hold audio until user transcript is shown
              audioBufferRef.current.push(base64);
            } else {
              playAudio(base64);
              store.setAiState('speaking');
            }
          },
          onTranscript: (entry: TranscriptEntry) => {
            store.addTranscriptEntry(entry);
            store.setAiState('listening');
          },
          onUserTranscript: (entry: TranscriptEntry) => {
            store.addTranscriptEntry(entry);
            // User transcript is now displayed — release buffered AI audio
            releaseAudioBuffer();
          },
          onTurnComplete: () => {
            store.setAiState('listening');
          },
          onSessionStarted: () => {
            clearInitTimeout();
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
            clearInitTimeout();
            toast.error(message);
            // Unblock spinner if session setup fails (e.g. Gemini connection error)
            setIsInitializing(false);
            // Reset from 'thinking' in case error arrived while waiting for AI response
            store.setAiState('listening');
          },
        },
      );

      setInitStep('ai');

      // Safety valve: unblock spinner if server never sends session_started or error
      sessionStartTimeoutRef.current = setTimeout(() => {
        if (isInitializingRef.current) {
          isInitializingRef.current = false;
          setIsInitializing(false);
          toast.error('Connection timed out. Please refresh to try again.');
        }
      }, SESSION_START_TIMEOUT_MS);
    };

    init();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (sessionStartTimeoutRef.current) {
        clearTimeout(sessionStartTimeoutRef.current);
        sessionStartTimeoutRef.current = null;
      }
      if (audioReleaseTimerRef.current) {
        clearTimeout(audioReleaseTimerRef.current);
        audioReleaseTimerRef.current = null;
      }
      isInitializingRef.current = false;
      // Release microphone on unmount
      stopCapture();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const INIT_STEP_LABELS = {
    mic:        'Requesting microphone access...',
    connecting: 'Connecting to server...',
    ai:         'Starting AI interviewer...',
  } as const;

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Spinner size="lg" />
        <p className="text-[var(--text-secondary)] font-body text-sm">
          {INIT_STEP_LABELS[initStep]}
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
      <div className="h-screen flex flex-col overflow-hidden">
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
