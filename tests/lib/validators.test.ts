import {
  validateParticipantName,
  validateTopic,
  validateInterviewStatus,
  validateTranscriptEntry,
} from '@/lib/validators';
import { INTERVIEW_STATUS, TRANSCRIPT_SPEAKER } from '@/lib/constants';

describe('validateParticipantName', () => {
  it('accepts valid names', () => {
    expect(validateParticipantName('John Doe')).toBe(true);
    expect(validateParticipantName('A')).toBe(true);
  });

  it('rejects empty strings', () => {
    expect(validateParticipantName('')).toBe(false);
  });

  it('rejects whitespace-only strings', () => {
    expect(validateParticipantName('   ')).toBe(false);
  });
});

describe('validateTopic', () => {
  it('accepts valid topics', () => {
    expect(validateTopic('SaaS for dentists')).toBe(true);
  });

  it('rejects empty topics', () => {
    expect(validateTopic('')).toBe(false);
  });

  it('rejects topics over 100 characters', () => {
    expect(validateTopic('a'.repeat(101))).toBe(false);
  });

  it('accepts topics at exactly 100 characters', () => {
    expect(validateTopic('a'.repeat(100))).toBe(true);
  });
});

describe('validateInterviewStatus', () => {
  it('accepts valid statuses', () => {
    expect(validateInterviewStatus(INTERVIEW_STATUS.ACTIVE)).toBe(true);
    expect(validateInterviewStatus(INTERVIEW_STATUS.COMPLETED)).toBe(true);
    expect(validateInterviewStatus(INTERVIEW_STATUS.ANALYZED)).toBe(true);
  });

  it('rejects invalid statuses', () => {
    expect(validateInterviewStatus('invalid')).toBe(false);
    expect(validateInterviewStatus('')).toBe(false);
  });
});

describe('validateTranscriptEntry', () => {
  it('accepts valid entries', () => {
    expect(
      validateTranscriptEntry({
        speaker: TRANSCRIPT_SPEAKER.AI,
        text: 'Hello',
        timestamp: 1000,
      }),
    ).toBe(true);
  });

  it('rejects entries with empty text', () => {
    expect(
      validateTranscriptEntry({
        speaker: TRANSCRIPT_SPEAKER.USER,
        text: '',
        timestamp: 1000,
      }),
    ).toBe(false);
  });

  it('rejects entries with invalid speaker', () => {
    expect(
      validateTranscriptEntry({
        speaker: 'invalid' as never,
        text: 'Hello',
        timestamp: 1000,
      }),
    ).toBe(false);
  });

  it('rejects entries with negative timestamp', () => {
    expect(
      validateTranscriptEntry({
        speaker: TRANSCRIPT_SPEAKER.AI,
        text: 'Hello',
        timestamp: -1,
      }),
    ).toBe(false);
  });
});
