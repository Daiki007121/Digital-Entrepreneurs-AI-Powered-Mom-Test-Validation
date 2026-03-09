// Implements #6: Silence indicator — warns when silence is prolonged
'use client';

import { VolumeX } from 'lucide-react';
import { SILENCE_TIMEOUT_SECONDS } from '@/lib/constants';

interface SilenceIndicatorProps {
  silenceSeconds: number;
}

const SHOW_THRESHOLD = 5;

export function SilenceIndicator({ silenceSeconds }: SilenceIndicatorProps) {
  if (silenceSeconds < SHOW_THRESHOLD) return null;

  const progress = Math.min(silenceSeconds / SILENCE_TIMEOUT_SECONDS, 1);
  const isUrgent = silenceSeconds >= SILENCE_TIMEOUT_SECONDS - 2;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium font-body
        ${isUrgent ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}
      `}
      role="alert"
      aria-label={`Silence detected: ${Math.round(silenceSeconds)} seconds of ${SILENCE_TIMEOUT_SECONDS} seconds`}
    >
      <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Silence: {Math.round(silenceSeconds)}s / {SILENCE_TIMEOUT_SECONDS}s</span>
      <div className="w-12 h-1.5 rounded-full bg-current/20 overflow-hidden" aria-hidden="true">
        <div
          className="h-full rounded-full bg-current transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
