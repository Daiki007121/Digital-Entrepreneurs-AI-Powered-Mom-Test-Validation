// Implements #10: Expandable pain point card with severity badge and evidence
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PainPoint } from '@/types';

interface PainPointCardProps {
  painPoint: PainPoint;
  index: number;
}

const severityVariant: Record<PainPoint['severity'], 'error' | 'warning' | 'completed' | 'default'> = {
  critical: 'error',
  high: 'warning',
  medium: 'completed',
  low: 'default',
};

export function PainPointCard({ painPoint, index }: PainPointCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="glass rounded-glass overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="flex w-full items-center justify-between p-4 text-left cursor-pointer hover:bg-primary/5 transition-colors duration-200"
        aria-expanded={isExpanded}
        aria-controls={`pain-point-${index}-details`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {index + 1}
          </span>
          <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)] truncate">
            {painPoint.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Badge variant={severityVariant[painPoint.severity]}>
            {painPoint.severity}
          </Badge>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div
          id={`pain-point-${index}-details`}
          className="border-t border-[var(--border-subtle)] p-4"
        >
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] font-body mb-2">
            Evidence
          </h4>
          <ul className="space-y-2">
            {painPoint.evidence.map((quote, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 text-primary/40 font-body" aria-hidden="true">&ldquo;</span>
                <blockquote className="text-sm text-[var(--text-secondary)] font-body italic">
                  {quote}
                </blockquote>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
