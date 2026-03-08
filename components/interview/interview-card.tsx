// Implements #8: Interview card for dashboard grid
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Play, CheckCircle, BarChart3, Clock, Trash2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { InterviewStatus } from '@/lib/constants';

interface InterviewCardProps {
  id: string;
  participantName: string;
  topic: string;
  status: InterviewStatus;
  durationSeconds: number | null;
  createdAt: string;
}

const statusConfig: Record<InterviewStatus, { label: string; variant: 'active' | 'completed' | 'analyzing' | 'analyzed'; icon: React.ReactNode }> = {
  active: { label: 'Active', variant: 'active', icon: <Play className="h-3.5 w-3.5" /> },
  completed: { label: 'Analyzing...', variant: 'analyzing', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = () => {
    if (status === 'active') {
      router.push(`/interview/${id}`);
    } else if (status === 'analyzed') {
      router.push(`/dashboard/${id}/report`);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/interview/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success('Interview deleted');
      setShowDeleteConfirm(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete interview');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
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

        <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)] font-body">
          <div className="flex items-center gap-4">
            <span>{format(new Date(createdAt), 'MMM d, yyyy')}</span>
            {durationSeconds != null && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {formatDuration(durationSeconds)}
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors duration-200 cursor-pointer"
            aria-label={`Delete interview with ${participantName}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </Card>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Interview?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)] font-body">
          Are you sure you want to delete the interview with <strong>{participantName}</strong>?
          This will permanently remove the transcript, analysis, and all related data.
        </p>
      </Modal>
    </>
  );
}
