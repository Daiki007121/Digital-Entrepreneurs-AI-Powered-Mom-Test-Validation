I made the alpha version on google AI studio. It works without running out of the tokens. This is the architecture. Architecture Overview: Digital Entrepreneurs (Mom Test AI)
The application is currently built as a Frontend-Only Single Page Application (SPA). It leverages a dual-model Gemini architecture, routing specific tasks to the most appropriate model.

1. Technology Stack
   UI Framework: React 19 / TypeScript / Vite
   Styling: Tailwind CSS v4 / Lucide React (Icons)
   AI SDK: @google/genai (Google’s latest official SDK)
2. Application Flow and AI Models
   The application operates in three distinct phases:
   Phase 1: Setup (Preparation)
   The Founder enters their Business Idea and Target User.
   This data is stored in React State and is secretly passed as System Instructions to the AI during the upcoming interview phase.
   Phase 2: Interview (Real-Time Audio Conversation)
   • Model Used: gemini-2.5-flash-native-audio-preview-09-2025 (Live API / WebSocket)
   • Audio Input: Captures microphone input via the browser’s getUserMedia. A ScriptProcessorNode (buffer size: 8192) converts the audio to PCM16 format and streams it to Gemini in real-time.
   • Audio Output: Plays the binary audio data returned by Gemini smoothly using a custom AudioStreamer class built on the Web Audio API.
   • Transcription: \* AI Speech: Captured using the Live API’s outputAudioTranscription feature.
   User Speech: Captured using the browser’s native Web Speech API (webkitSpeechRecognition).
   • Voice Activity Detection (VAD): Calculates the RMS (Root Mean Square) of the microphone input. The interview automatically terminates if 10 seconds of continuous silence is detected from both the user and the AI.
   Phase 3: Analysis (Post-Interview)
   • Model Used: gemini-3.1-pro-preview (REST API)
   • Process: Upon completion, the entire conversation transcript is combined with the initial “Business Idea” and “Target User” to form the analysis prompt.
   • Structured Outputs: Uses JSON Schema to enforce a strict JSON response from Gemini 3.1 Pro. This ensures the reliable parsing and display of key metrics on the Report UI, including:
   Validated Problems
   Disproved Hypotheses
   Mom Test Score
   Summary and Final Verdict
