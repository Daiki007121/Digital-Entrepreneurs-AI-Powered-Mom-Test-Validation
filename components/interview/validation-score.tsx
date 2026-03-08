// Implements #10: Animated radial SVG validation score (0-100)
'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ValidationScoreProps {
  score: number;
}

function getScoreConfig(score: number) {
  if (score >= 70) {
    return {
      color: 'var(--cta)',
      bgColor: 'bg-cta/10',
      textColor: 'text-cta-dark dark:text-cta-light',
      label: 'Strong Validation',
      Icon: CheckCircle,
    };
  }
  if (score >= 40) {
    return {
      color: '#f59e0b',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-600 dark:text-amber-400',
      label: 'Moderate Validation',
      Icon: AlertTriangle,
    };
  }
  return {
    color: '#ef4444',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-600 dark:text-red-400',
    label: 'Weak Validation',
    Icon: XCircle,
  };
}

export function ValidationScore({ score }: ValidationScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const config = getScoreConfig(score);
  const { Icon } = config;

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div
      className="flex flex-col items-center gap-3"
      aria-label={`Validation score: ${score} out of 100 — ${config.label}`}
      role="img"
    >
      <div className="relative h-40 w-40">
        <svg className="h-40 w-40 -rotate-90" viewBox="0 0 140 140">
          {/* Background circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke="var(--border-subtle)"
            strokeWidth="10"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke={config.color}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold font-heading ${config.textColor}`}>
            {animatedScore}
          </span>
          <span className="text-xs text-[var(--text-muted)] font-body">/100</span>
        </div>
      </div>
      <div className={`flex items-center gap-1.5 ${config.textColor}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm font-semibold font-body">{config.label}</span>
      </div>
    </div>
  );
}
