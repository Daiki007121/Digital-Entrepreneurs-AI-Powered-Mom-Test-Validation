import { INTERVIEW_STATUS, TRANSCRIPT_SPEAKER } from '@/lib/constants';
import type { TranscriptEntry } from '@/types';

const validStatuses = Object.values(INTERVIEW_STATUS);
const validSpeakers = Object.values(TRANSCRIPT_SPEAKER);

/**
 * Validates a participant name is non-empty after trimming.
 */
export function validateParticipantName(name: string): boolean {
  return name.trim().length > 0;
}

/**
 * Validates a topic is non-empty and within 100 characters.
 */
export function validateTopic(topic: string): boolean {
  const trimmed = topic.trim();
  return trimmed.length > 0 && trimmed.length <= 100;
}

/**
 * Validates an interview status is one of the allowed values.
 */
export function validateInterviewStatus(status: string): boolean {
  return validStatuses.includes(status as typeof validStatuses[number]);
}

/**
 * Validates a transcript entry has valid speaker, non-empty text, and non-negative timestamp.
 */
export function validateTranscriptEntry(entry: TranscriptEntry): boolean {
  return (
    validSpeakers.includes(entry.speaker as typeof validSpeakers[number]) &&
    entry.text.trim().length > 0 &&
    entry.timestamp >= 0
  );
}
