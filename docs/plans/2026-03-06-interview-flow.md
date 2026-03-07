# Plan 3: Interview Flow

**Issues**: #5, #6, #7
**Branch**: `feature/5-interview-flow`

## Step 1: Interview Setup + Consent
- `app/interview/new/page.tsx` (server component)
- `components/interview/interview-setup-form.tsx` (client): React Hook Form + Zod
  - Fields: participant name, business idea/topic, target user description
  - Consent checkbox (required): "I confirm the participant has consented to being recorded and transcribed"
  - "Start Interview" button disabled until consent is checked
  - Submit -> POST `/api/interview/start` -> redirect `/interview/[id]`
- `app/api/interview/start/route.ts`: validate (including consent=true), auth, create interview (status: 'active'), return `{ id }`

## Step 2: Audio Handling (ported from alpha)
- `lib/hooks/use-audio-session.ts`:
  - `requestMicrophoneAccess()`: `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000 } })`
  - Permission denied: toast with instructions
  - Audio capture: `ScriptProcessorNode` (buffer 8192) converts to PCM16 — upgrade path to `AudioWorkletNode` in post-MVP (#18)
  - RMS calculation: compute RMS of each audio buffer, send to relay for silence detection
  - `playAudioResponse(audioData)`: custom `AudioStreamer` class using Web Audio API (ported from alpha)
  - Cleanup on unmount: release media stream, close AudioContext
- `lib/audio-streamer.ts`: `AudioStreamer` class (ported from alpha) — smooth playback of streaming audio chunks via Web Audio API

## Step 3: Transcription
- AI speech: received via relay server (Gemini `outputAudioTranscription`)
- User speech: `lib/hooks/use-speech-recognition.ts` — wraps browser `webkitSpeechRecognition` / `SpeechRecognition` API
  - Continuous mode, interim results
  - Fallback: if Speech API not available, show "User speech transcription unavailable" (non-blocking)

## Step 4: WebSocket Hook
- `lib/hooks/use-realtime-session.ts`:
  - Connect to `ws://localhost:8081/ws` (configurable via env)
  - States: idle -> connecting -> connected -> disconnected | error
  - Auto-reconnect: exponential backoff (1s, 2s, 4s, 8s, 16s), max 5 retries
  - Sends: PCM16 audio chunks + RMS values
  - Receives: AI audio data + AI transcript text + session events (warning, timeout, silence-detected)
  - Duration tracking with 12min warning callback
  - Exposes: `connect()`, `disconnect()`, `sendAudio()`, `connectionStatus`, `transcript[]`, `elapsedSeconds`

## Step 5: Interview Store
- `lib/stores/interview-store.ts` (Zustand): interviewId, participantName, topic, targetUser, transcript[], elapsedSeconds, isRecording, aiState, silenceSeconds

## Step 6: Interview UI Components
- `components/interview/transcript-feed.tsx`: auto-scroll, AI=blue/User=gray, DOMPurify, `role="log"` + `aria-live="polite"`
- `components/interview/ai-status-indicator.tsx`: listening/speaking/thinking with icon+color
- `components/interview/session-timer.tsx`: MM:SS, yellow@12min, red@15min
- `components/interview/silence-indicator.tsx`: shows silence counter when > 5s ("Silence: 7s / 10s"), visual warning
- `components/interview/session-controls.tsx`: "End Session" (confirmation modal), mic mute toggle

## Step 7: Live Interview Page
- `app/interview/[id]/page.tsx` (server): fetch interview, validate ownership
- `components/interview/live-interview-view.tsx` (client): split layout, error boundary, on mount: mic -> WebSocket -> session, on end: disconnect

## Step 8: Save Transcript API
- `app/api/interview/[id]/route.ts`: GET (fetch) + PATCH (save transcript, status='completed', DOMPurify)
- Relay server handles incremental checkpoints + final write + auto-triggers analysis

**Verify**: Audio capture + playback, speech recognition, silence detection, transcript rendering

## User Testing Checkpoint (after this plan, before Plan 4)

**Goal**: Validate the core interview experience with 2 real founders before building dashboard + analysis.

**What to test**:
1. Can they log in and start an interview?
2. Does the AI sound natural and follow Mom Test rules?
3. Is the transcript accurate (both AI and user speech)?
4. Does the silence detection work correctly?
5. Does the session end cleanly and save the transcript?

**What to look for**:
- Audio quality issues (echo, delay, cutting out)
- Mom Test violations (AI asking leading questions)
- Confusing UX (unclear what to do, buttons hard to find)
- Browser compatibility issues

**Action**: Fix critical issues before proceeding. Non-critical feedback -> GitHub Issues for post-MVP.

## Definition of Done
- All tests passing (TDD for lib/server, smoke for UI)
- CI green (lint + typecheck + test + build)
- Code committed and pushed to feature branch
- PR created and merged to `development`
- No TypeScript errors, no ESLint warnings
