// Implements #6: Session timer with warnings
'use client';

import { Clock } from 'lucide-react';
import {
  INTERVIEW_WARNING_SECONDS,
  MAX_INTERVIEW_DURATION_SECONDS,
} from '@/lib/constants';

interface SessionTimerProps {
  elapsedSeconds: number;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function SessionTimer({ elapsedSeconds }: SessionTimerProps) {
  const isWarning = elapsedSeconds >= INTERVIEW_WARNING_SECONDS;
  const isDanger = elapsedSeconds >= MAX_INTERVIEW_DURATION_SECONDS - 60; // Last minute

  let colorClass = 'text-[var(--text-secondary)]';
  let bgClass = 'bg-[var(--bg-surface)]';
  if (isDanger) {
    colorClass = 'text-red-500';
    bgClass = 'bg-red-500/10';
  } else if (isWarning) {
    colorClass = 'text-amber-500';
    bgClass = 'bg-amber-500/10';
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${bgClass} ${colorClass} text-sm font-mono font-medium`}
      aria-label={`Interview duration: ${formatTime(elapsedSeconds)}`}
      role="timer"
    >
      <Clock className="w-4 h-4" aria-hidden="true" />
      <span>{formatTime(elapsedSeconds)}</span>
    </div>
  );
}
