// Implements #8: Dashboard API — GET user's interviews
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const user = await getAuthUser();
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('interviews')
      .select('id, participant_name, topic, target_user, status, duration_seconds, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch interviews' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
