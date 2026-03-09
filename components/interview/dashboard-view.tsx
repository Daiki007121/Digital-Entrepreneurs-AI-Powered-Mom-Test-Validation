// Implements #8: Dashboard view — interview grid, empty state, New Interview FAB
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InterviewCard } from './interview-card';
import type { InterviewStatus } from '@/lib/constants';

interface InterviewRow {
  id: string;
  participant_name: string;
  topic: string;
  target_user: string;
  status: string;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

interface DashboardViewProps {
  interviews: InterviewRow[];
}

const POLL_INTERVAL_MS = 5000;

export function DashboardView({ interviews }: DashboardViewProps) {
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll when any interview is analyzing, or was recently active (covers the
  // timing gap where the server hasn't yet transitioned active → completed)
  const hasAnalyzing = interviews.some(
    (i) => i.status === 'completed' ||
      (i.status === 'active' && Date.now() - new Date(i.updated_at).getTime() < 60_000)
  );

  useEffect(() => {
    if (hasAnalyzing) {
      pollRef.current = setInterval(() => {
        router.refresh();
      }, POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [hasAnalyzing, router]);

  if (interviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 rounded-full bg-primary/10 p-4">
          <MessageSquare className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
          No interviews yet
        </h2>
        <p className="mt-2 max-w-sm text-sm text-[var(--text-secondary)] font-body">
          Start your first Mom Test interview to validate your business idea with real user insights.
        </p>
        <Button
          className="mt-6"
          onClick={() => router.push('/interview/new')}
          icon={<Plus className="h-4 w-4" />}
          aria-label="Start new interview"
        >
          New Interview
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {interviews.map((interview) => (
          <InterviewCard
            key={interview.id}
            id={interview.id}
            participantName={interview.participant_name}
            topic={interview.topic}
            status={interview.status as InterviewStatus}
            durationSeconds={interview.duration_seconds}
            createdAt={interview.created_at}
          />
        ))}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => router.push('/interview/new')}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all duration-200 hover:bg-primary-dark hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 cursor-pointer"
        aria-label="Start new interview"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
