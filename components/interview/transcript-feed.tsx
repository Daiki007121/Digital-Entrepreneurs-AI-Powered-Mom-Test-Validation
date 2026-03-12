// Implements #6: Real-time transcript feed
'use client';

import { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Bot, User } from 'lucide-react';
import type { TranscriptEntry } from '@/types';

interface TranscriptFeedProps {
  transcript: TranscriptEntry[];
  interimUserText?: string;
}

// Merge consecutive user entries that arrive close together (< 15s gap) into one bubble.
// Handles cases where Gemini sends inputTranscription as multiple fragments.
function mergeConsecutiveUserEntries(entries: TranscriptEntry[]): TranscriptEntry[] {
  return entries.reduce<TranscriptEntry[]>((acc, entry) => {
    const prev = acc[acc.length - 1];
    const isUser = entry.speaker === 'user';
    const prevIsUser = prev?.speaker === 'user';
    const withinWindow = prev && entry.timestamp - prev.timestamp < 15_000;
    if (isUser && prevIsUser && withinWindow) {
      return [
        ...acc.slice(0, -1),
        { ...prev, text: `${prev.text} ${entry.text}` },
      ];
    }
    return [...acc, entry];
  }, []);
}

export function TranscriptFeed({ transcript, interimUserText }: TranscriptFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const merged = mergeConsecutiveUserEntries(transcript);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [transcript, interimUserText]);

  return (
    <div
      ref={feedRef}
      role="log"
      aria-live="polite"
      aria-label="Interview transcript"
      className="flex flex-col gap-3 overflow-y-auto h-full p-4"
    >
      {merged.length === 0 && !interimUserText && (
        <p className="text-center text-[var(--text-muted)] text-sm py-8">
          Transcript will appear here as the interview progresses...
        </p>
      )}

      {merged.map((entry, i) => {
        const isAi = entry.speaker === 'ai' || entry.speaker === 'ai-transcription';
        const sanitizedText = DOMPurify.sanitize(entry.text);

        return (
          <div
            key={`${entry.timestamp}-${i}`}
            className={`flex gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}
          >
            {isAi && (
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center"
                aria-hidden="true"
              >
                <Bot className="w-4 h-4 text-blue-500" />
              </div>
            )}
            <div
              className={`
                max-w-[75%] rounded-2xl px-4 py-2.5 text-sm font-body
                ${isAi
                  ? 'bg-blue-500/10 text-[var(--text-primary)] border border-blue-500/20'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }
              `}
            >
              <p dangerouslySetInnerHTML={{ __html: sanitizedText }} />
            </div>
            {!isAi && (
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--text-muted)]/20 flex items-center justify-center"
                aria-hidden="true"
              >
                <User className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
            )}
          </div>
        );
      })}

      {interimUserText && (
        <div className="flex gap-2.5 justify-end opacity-60">
          <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm font-body bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] border-dashed">
            <p>{interimUserText}</p>
          </div>
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--text-muted)]/20 flex items-center justify-center"
            aria-hidden="true"
          >
            <User className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
        </div>
      )}
    </div>
  );
}
