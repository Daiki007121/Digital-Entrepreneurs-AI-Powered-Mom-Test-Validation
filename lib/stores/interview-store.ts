// Implements #6: Zustand store for interview session state
import { create } from 'zustand';
import type { TranscriptEntry } from '@/types';

type AiState = 'idle' | 'listening' | 'speaking' | 'thinking';

interface InterviewState {
  interviewId: string | null;
  participantName: string;
  topic: string;
  targetUser: string;
  transcript: TranscriptEntry[];
  elapsedSeconds: number;
  isRecording: boolean;
  aiState: AiState;
  silenceSeconds: number;
}

interface InterviewActions {
  setSession: (config: {
    interviewId: string;
    participantName: string;
    topic: string;
    targetUser: string;
  }) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  setElapsedSeconds: (seconds: number) => void;
  setIsRecording: (recording: boolean) => void;
  setAiState: (state: AiState) => void;
  setSilenceSeconds: (seconds: number) => void;
  reset: () => void;
}

const initialState: InterviewState = {
  interviewId: null,
  participantName: '',
  topic: '',
  targetUser: '',
  transcript: [],
  elapsedSeconds: 0,
  isRecording: false,
  aiState: 'idle',
  silenceSeconds: 0,
};

export const useInterviewStore = create<InterviewState & InterviewActions>((set) => ({
  ...initialState,

  setSession: (config) =>
    set({
      interviewId: config.interviewId,
      participantName: config.participantName,
      topic: config.topic,
      targetUser: config.targetUser,
    }),

  addTranscriptEntry: (entry) =>
    set((state) => ({ transcript: [...state.transcript, entry] })),

  setElapsedSeconds: (seconds) => set({ elapsedSeconds: seconds }),

  setIsRecording: (recording) => set({ isRecording: recording }),

  setAiState: (state) => set({ aiState: state }),

  setSilenceSeconds: (seconds) => set({ silenceSeconds: seconds }),

  reset: () => set(initialState),
}));
