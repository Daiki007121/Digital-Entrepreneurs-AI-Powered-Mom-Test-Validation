# Plan 2: Mom Test Prompts + Gemini Relay Server

**Issues**: #4, #3
**Branch**: `feature/3-mom-test-relay`

## Step 1: System Prompts

### `prompts/momTestEnforcer.md`
- `{{TOPIC}}` and `{{TARGET_USER}}` placeholders
- Mom Test rules (never leading questions, always past behavior)
- Interview flow: opening -> exploration -> deep-dive -> closing
- Self-monitoring instructions
- Adapted for Gemini system instruction format (passed as `systemInstruction` in Live API config)

### `prompts/insightAnalyzer.md`
- Transcript JSON input
- JSON Schema output: `{ validationScore, painPoints[{title,severity,evidence[]}], themes[], nextSteps[], summary, finalVerdict }`
- Uses Gemini's native JSON Schema structured output

## Step 2: Prompt Utilities (TDD)

### TDD: `tests/lib/prompt-loader.test.ts` -> `lib/prompt-loader.ts`
- Load and parse prompt files from `/prompts/`
- Replace placeholders with provided values

### TDD: `tests/lib/mom-test.test.ts` -> `lib/mom-test.ts`
- `buildInterviewPrompt(topic, targetUser)` — builds system instruction for Gemini Live API
- `buildAnalysisPrompt(transcript, businessIdea, targetUser)` — builds prompt for Gemini 3.1 Pro
- `detectLeadingQuestion(text): { isLeading, pattern? }` — checks AI output for Mom Test violations

**Verify**: All tests green

## Step 3: Relay Server — Gemini Live API (TDD)

### `server/types.ts`
- `SessionConfig`, `GeminiLiveEvent`, `ServerMessage`, `TranscriptEntry`

### `server/index.ts`
- Express, `GET /health`, WebSocket upgrade on `/ws`
- CORS, env validation (`GOOGLE_AI_API_KEY` required)
- Graceful shutdown

### `server/gemini-relay.ts` — `GeminiRelay` class
- Uses `@google/genai` SDK to establish Gemini Live API session
- Model: `gemini-2.5-flash-native-audio-preview`
- Injects Mom Test system prompt via `systemInstruction` config
- Enables `outputAudioTranscription` for AI speech transcription
- Bidirectional audio forwarding:
  - Client -> Gemini: PCM16 audio chunks (from browser mic via relay)
  - Gemini -> Client: audio response data (binary, for AudioStreamer playback)
  - Gemini -> Client: transcript text (via `outputAudioTranscription`)
- Logs events to `ai_logs`, runs `detectLeadingQuestion()` on AI transcript text

### TDD: `tests/server/session-manager.test.ts` -> `server/session-manager.ts`
- Maps client WS -> { Gemini session, interviewId, transcript[], timers }
- Duration tracking: warn at 12min, auto-end at 15min
- RMS silence detection: receives RMS values from client, tracks silence duration, auto-ends after 10s continuous silence
- Transcript checkpoint: PATCH transcript to Supabase every 30s
- `createSession()`, `endSession()` — on end: final transcript write + auto-trigger analysis

### Scripts
- `dev: tsx watch index.ts`
- `build: tsc`
- `start: node dist/index.js`

**Verify**: All tests green, health returns 200

## Definition of Done
- All tests passing (TDD for lib/server, smoke for UI)
- CI green (lint + typecheck + test + build)
- Code committed and pushed to feature branch
- PR created and merged to `development`
- No TypeScript errors, no ESLint warnings
