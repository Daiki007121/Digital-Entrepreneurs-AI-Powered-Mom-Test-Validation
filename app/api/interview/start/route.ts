// Implements #5: Create a new interview
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { INTERVIEW_STATUS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    const body = await request.json();

    const { participantName, topic, targetUser } = body as {
      participantName?: string;
      topic?: string;
      targetUser?: string;
    };

    if (!participantName?.trim()) {
      return NextResponse.json({ error: 'Participant name is required' }, { status: 400 });
    }
    if (!topic?.trim()) {
      return NextResponse.json({ error: 'Business idea/topic is required' }, { status: 400 });
    }
    if (!targetUser?.trim()) {
      return NextResponse.json({ error: 'Target user description is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('interviews')
      .insert({
        user_id: user.id,
        participant_name: participantName.trim(),
        topic: topic.trim(),
        target_user: targetUser.trim(),
        status: INTERVIEW_STATUS.ACTIVE,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
