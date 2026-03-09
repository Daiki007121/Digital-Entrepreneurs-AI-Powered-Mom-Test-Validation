// Implements #6: AI status indicator (listening/speaking/thinking)
'use client';

import { Ear, Volume2, Brain } from 'lucide-react';

type AiState = 'idle' | 'listening' | 'speaking' | 'thinking';

interface AiStatusIndicatorProps {
  state: AiState;
}

const stateConfig: Record<AiState, { label: string; icon: typeof Ear; color: string; bgColor: string }> = {
  idle: {
    label: 'Idle',
    icon: Ear,
    color: 'text-[var(--text-muted)]',
    bgColor: 'bg-[var(--text-muted)]/10',
  },
  listening: {
    label: 'Listening',
    icon: Ear,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  speaking: {
    label: 'Speaking',
    icon: Volume2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  thinking: {
    label: 'Thinking',
    icon: Brain,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
};

export function AiStatusIndicator({ state }: AiStatusIndicatorProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${config.color} text-xs font-medium font-body`}
      aria-label={`AI is ${config.label.toLowerCase()}`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{config.label}</span>
      {(state === 'listening' || state === 'thinking') && (
        <span className="flex gap-0.5" aria-hidden="true">
          <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
          <span className="w-1 h-1 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
          <span className="w-1 h-1 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
        </span>
      )}
    </div>
  );
}
