// Supabase operations for the relay server
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
}

/**
 * Updates the transcript for an active interview (checkpoint).
 */
export async function updateTranscript(
  interviewId: string,
  transcriptJson: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('interviews')
    .update({ transcript: JSON.parse(transcriptJson) })
    .eq('id', interviewId);

  if (error) {
    throw new Error(`Failed to update transcript: ${error.message}`);
  }
}

/**
 * Marks an interview as completed and saves the final transcript + duration.
 */
export async function completeInterview(
  interviewId: string,
  transcriptJson: string,
  durationSeconds: number,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('interviews')
    .update({
      transcript: JSON.parse(transcriptJson),
      status: 'completed',
      duration_seconds: durationSeconds,
    })
    .eq('id', interviewId);

  if (error) {
    throw new Error(`Failed to complete interview: ${error.message}`);
  }
}

/**
 * Logs an AI event for debugging.
 */
export async function logAiEvent(
  interviewId: string,
  eventType: string,
  payload: unknown,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('ai_logs').insert({
    interview_id: interviewId,
    event_type: eventType,
    payload,
  });

  if (error) {
    console.error(`Failed to log AI event: ${error.message}`);
  }
}
