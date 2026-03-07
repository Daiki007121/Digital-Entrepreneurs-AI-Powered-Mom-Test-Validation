import type { InterviewStatus, TranscriptSpeaker } from '@/lib/constants';

export interface TranscriptEntry {
  speaker: TranscriptSpeaker;
  text: string;
  timestamp: number;
}

export interface Interview {
  id: string;
  userId: string;
  participantName: string;
  topic: string;
  status: InterviewStatus;
  transcript: TranscriptEntry[];
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PainPoint {
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
}

export interface Insight {
  id: string;
  interviewId: string;
  validationScore: number;
  painPoints: PainPoint[];
  themes: string[];
  nextSteps: string[];
  rawAnalysis: string | null;
  createdAt: string;
}

export interface AnalysisResult {
  validationScore: number;
  painPoints: PainPoint[];
  themes: string[];
  nextSteps: string[];
  summary: string;
  finalVerdict: string;
}
