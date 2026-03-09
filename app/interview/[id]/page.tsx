// Implements #6: Live Interview page (server component)
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { LiveInterviewView } from '@/components/interview/live-interview-view';

interface PageProps {
  params: { id: string };
}

export default async function InterviewPage({ params }: PageProps) {
  const user = await getAuthUser();
  const supabase = createServerSupabaseClient();

  const { data: interview, error } = await supabase
    .from('interviews')
    .select('id, participant_name, topic, target_user, status, user_id')
    .eq('id', params.id)
    .single();

  if (error || !interview) {
    redirect('/dashboard');
  }

  // Validate ownership
  if (interview.user_id !== user.id) {
    redirect('/dashboard');
  }

  // If interview is already completed/analyzed, redirect to dashboard
  if (interview.status !== 'active') {
    redirect('/dashboard');
  }

  return (
    <LiveInterviewView
      interviewId={interview.id}
      participantName={interview.participant_name}
      topic={interview.topic}
      targetUser={interview.target_user}
      userId={user.id}
    />
  );
}
