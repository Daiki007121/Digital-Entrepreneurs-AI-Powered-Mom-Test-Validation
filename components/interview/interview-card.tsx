// Implements #8: Interview card for dashboard grid
'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Play, CheckCircle, BarChart3, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { InterviewStatus } from '@/lib/constants';

interface InterviewCardProps {
  id: string;
  participantName: string;
  topic: string;
  status: InterviewStatus;
  durationSeconds: number | null;
  createdAt: string;
}

const statusConfig: Record<InterviewStatus, { label: string; variant: 'active' | 'completed' | 'analyzed'; icon: React.ReactNode }> = {
  active: { label: 'Active', variant: 'active', icon: <Play className="h-3.5 w-3.5" /> },
  completed: { label: 'Completed', variant: 'completed', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  analyzed: { label: 'Analyzed', variant: 'analyzed', icon: <BarChart3 className="h-3.5 w-3.5" /> },
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function InterviewCard({
  id,
  participantName,
  topic,
  status,
  durationSeconds,
  createdAt,
}: InterviewCardProps) {
  const router = useRouter();
  const config = statusConfig[status];

  const handleClick = () => {
    if (status === 'active') {
      router.push(`/interview/${id}`);
    } else if (status === 'analyzed') {
      router.push(`/dashboard/${id}/report`);
    }
  };

  return (
    <Card
      hover
      padding="md"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Interview with ${participantName} — ${config.label}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] truncate">
            {participantName}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)] font-body line-clamp-2">
            {topic}
          </p>
        </div>
        <Badge variant={config.variant} icon={config.icon}>
          {config.label}
        </Badge>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-[var(--text-muted)] font-body">
        <span>{format(new Date(createdAt), 'MMM d, yyyy')}</span>
        {durationSeconds != null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formatDuration(durationSeconds)}
          </span>
        )}
      </div>
    </Card>
  );
}
