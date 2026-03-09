// Implements #7: Interview API — GET (fetch) + PATCH (save transcript) + DELETE
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface RouteContext {
  params: { id: string };
}

/**
 * Strips HTML tags from text as a lightweight server-side sanitizer.
 * Full DOMPurify runs on the client; relay server also sanitizes.
 */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthUser();
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthUser();
    const supabase = createServerSupabaseClient();

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('interviews')
      .select('id, user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Delete related records first (foreign key constraints)
    await supabase.from('insights').delete().eq('interview_id', params.id);
    await supabase.from('ai_logs').delete().eq('interview_id', params.id);

    const { error: deleteError } = await supabase
      .from('interviews')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete interview' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthUser();
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('interviews')
      .select('id, user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const update: Record<string, unknown> = {};

    if (body.transcript) {
      const sanitizedTranscript = (
        body.transcript as Array<{ speaker: string; text: string; timestamp: number }>
      ).map((entry) => ({
        ...entry,
        text: stripHtml(entry.text),
      }));
      update.transcript = sanitizedTranscript;
    }

    if (body.status) {
      update.status = body.status;
    }

    if (body.duration_seconds != null) {
      update.duration_seconds = body.duration_seconds;
    }

    const { error: updateError } = await supabase
      .from('interviews')
      .update(update)
      .eq('id', params.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
