// Implements #10: Insight API — GET insight + interview metadata
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface RouteContext {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthUser();
    const supabase = createServerSupabaseClient();

    // Fetch interview (verify ownership)
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('id, participant_name, topic, target_user, status, duration_seconds, created_at')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (interviewError || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Fetch insight
    const { data: insight, error: insightError } = await supabase
      .from('insights')
      .select('*')
      .eq('interview_id', params.id)
      .single();

    if (insightError || !insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    return NextResponse.json({ interview, insight });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
