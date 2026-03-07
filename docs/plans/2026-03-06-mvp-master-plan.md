# MVP Implementation Plan — Digital Entrepreneurs (v5 — Final)

## Executive Summary

**What**: AI-powered Mom Test interview tool — founders talk to an AI interviewer that enforces unbiased questioning, then get an automated insight report with validated pain points.

**Stack**: Next.js 14 + Node.js relay server + Gemini AI + Supabase

**Team**: 2 developers (teammate built Gemini alpha, joining this repo)

**Target**: MVP complete for first user testing

## Success Metrics
1. **5 founders** complete an end-to-end interview and receive an insight report
2. **AI never asks a leading question** during any test interview (Mom Test compliance)
3. **Insight reports are actionable** — at least 3/5 test founders say "I learned something I didn't know"
4. **Full flow works locally** — login → interview → transcript → auto-analysis → report

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Gemini Live API doesn't work through relay server | Architecture collapse — must redesign | Medium | **Plan 0 spike validates this first** |
| Web Speech API unreliable on some browsers | User transcription has gaps | Medium | Fallback: show "transcription unavailable", AI transcript still works |
| Gemini API pricing spikes or model deprecated | Cost blowup or broken features | Low | Track cost per interview, abstract AI calls behind interface for easy provider swap |
| Teammate's alpha patterns don't port cleanly to Next.js | Delays in audio/Gemini integration | Medium | Plan 0 spike tests this; teammate ports their own code |
| Supabase free tier limits hit during testing | Service disruption | Low | Monitor usage dashboard, upgrade if needed ($25/mo) |

---

## Context

Greenfield project. No source code exists. 13 open GitHub issues need cleanup. Teammate built a working alpha using Gemini (frontend-only SPA) — we're adopting Gemini as AI provider while keeping production architecture (Next.js + relay server + Supabase). Teammate will join this repo and port their audio/Gemini code.

**Decisions:**
- **AI Provider: Google Gemini** (not OpenAI) — ported from teammate's working alpha
  - Voice: `gemini-2.5-flash-native-audio-preview` (Gemini Live API / WebSocket)
  - Analysis: `gemini-3.1-pro-preview` (REST API with JSON Schema structured output)
  - SDK: `@google/genai`
- Database: **Supabase (PostgreSQL)**
- Auth: **Supabase Auth** — Google OAuth + email/password
- Architecture: **Next.js 14 + Node.js relay server + Supabase** (not frontend-only like alpha — need auth, persistence, API key security)
- **Local dev only** — no production deployment for MVP
- **Auto-analyze** on session end
- **RMS silence detection** (from alpha) + timer-based limits (12min warn, 15min auto-end)
- **Strict TDD** for `/lib` and `/server`; smoke tests for UI

### What we're porting from the alpha:
- Audio capture pattern: `getUserMedia` → `ScriptProcessorNode` (buffer 8192) → PCM16 streaming (will upgrade to `AudioWorkletNode`)
- Audio playback: custom `AudioStreamer` class via Web Audio API
- Transcription approach: AI speech via Gemini `outputAudioTranscription`, user speech via Web Speech API (`webkitSpeechRecognition`)
- RMS-based Voice Activity Detection (10s silence = auto-end)
- System instruction injection pattern (business idea + target user as context)

### What's different from the alpha:
- Relay server proxies Gemini (API key stays server-side, not in browser)
- Supabase for auth, data persistence, transcript storage
- Next.js App Router (not React SPA + Vite)
- Multi-user support with RLS

---

## Phase 0: GitHub Issue Cleanup + Creation

### Step 1: Close MVP issues with comment
Close issues #1–#11 (all covered by MVP plan). Add comment to each:
> "Implemented as part of MVP plan — see docs/plans/"

| Issue | Title | Reason |
|-------|-------|--------|
| #1 | [CHORE] Repository & project scaffolding | Plan 1, Step 1 |
| #2 | [CHORE] MongoDB connection and base Mongoose models | Plan 1, Step 3 |
| #3 | [FEATURE] OpenAI Realtime API relay server | Plan 2, Step 3 |
| #4 | [FEATURE] Mom Test system prompt and enforcement logic | Plan 2, Steps 1-2 |
| #5 | [FEATURE] Interview Setup screen (UI) | Plan 3, Step 1 |
| #6 | [FEATURE] Live Interview screen with real-time transcript | Plan 3, Steps 2-7 |
| #7 | [FEATURE] Save transcript to MongoDB after session | Plan 3, Step 8 |
| #8 | [FEATURE] Dashboard — session list | Plan 4 |
| #9 | [FEATURE] AI transcript analysis pipeline | Plan 5, Steps 1-2 |
| #10 | [FEATURE] Insight Report screen | Plan 5, Steps 3-5 |
| #11 | [FEATURE] Authentication (sign up / login) | Plan 1, Step 4 |

### Step 2: Update existing post-MVP issues
- **#12**: [FEATURE] Export Insight Report as PDF — update description to reference Gemini analysis output
- **#13**: [DOCS] API documentation — update to reflect Gemini + Supabase stack

### Step 3: Create new post-MVP issues (9 total after this step: #12, #13, #14–#20)

| New # | Title | Description | Priority |
|-------|-------|-------------|----------|
| #14 | [CHORE] Production deployment — Vercel + Fly.io | Deploy Next.js frontend to Vercel, relay server to Fly.io, configure env vars, custom domain, health monitoring | High |
| #15 | [FEATURE] WebSocket reconnection UX | "Reconnecting..." banner with attempt counter, graceful failure message, partial transcript preservation notification | Medium |
| #16 | [FEATURE] Structured logging & observability | Structured JSON logging, relay server health checks verifying Gemini + Supabase reachability | Medium |
| #17 | [CHORE] Supabase RPC rate limiting | Replace in-memory rate limiter with Supabase-based solution that works across multiple instances | Low |
| #18 | [CHORE] Upgrade ScriptProcessorNode to AudioWorkletNode | ScriptProcessorNode is deprecated. Migrate to AudioWorkletNode for better performance | Medium |
| #19 | [FEATURE] Interview audio recording & storage | Record full interview audio, upload to Supabase Storage, link URL to interview record for playback | Low |
| #20 | [FEATURE] Multiple interview templates | Pre-built topic templates (SaaS validation, marketplace, etc.) with tailored Mom Test prompts | Low |

### Step 4: Update CLAUDE.md
- Replace all "OpenAI Realtime API" → "Gemini Live API"
- Replace "GPT-4o" → "Gemini 3.1 Pro"
- Replace "gpt-4o-realtime-preview" → "gemini-2.5-flash-native-audio-preview"
- Add `@google/genai` to preferred libraries
- Update architecture rules: relay server proxies Gemini (not OpenAI)

---

## MVP Plans (6 Plans)

### Dependency Graph

```
Plan 0: Gemini Relay Spike (2-3 hours, throwaway prototype)
   |
Plan 1: Foundation (#1, #2, #11, #14, #15, #16)
   |
Plan 2: Mom Test Prompts + Gemini Relay Server (#4, #3)
   |
Plan 3: Interview Flow (#5, #6, #7)
   |
>> USER TESTING CHECKPOINT: Test with 2 founders (interview-only, no dashboard/analysis yet)
   |
Plan 4: Dashboard (#8)
   |
Plan 5: Analysis Pipeline + Insight Report (#9, #10)
```

### Post-MVP: Agile/Scrum Adoption
After MVP ships, switch to 1-week sprints with proper Scrum ceremonies:
- Sprint planning, daily standups, sprint review/demo, retrospective
- GitHub Issues as backlog (9 post-MVP issues already created)
- Story points for estimation
- Definition of Done enforced per sprint

---

## Plan 0: Gemini Relay Spike (Risk Validation)
**Time**: 2-3 hours | **Branch**: `spike/gemini-relay` | **Throwaway**: Yes (code discarded after validation)

**Why**: The alpha calls Gemini directly from the browser. We're adding a relay server in between — this has never been tested. If it doesn't work, the entire architecture needs rethinking. Validate before investing in infrastructure.

### What to build:
1. Minimal Node.js WebSocket server (~50 lines) that:
   - Accepts browser WebSocket connection
   - Connects to Gemini Live API via `@google/genai` SDK
   - Forwards PCM16 audio from browser → Gemini
   - Forwards Gemini audio response → browser
   - Returns AI transcript text
2. Raw HTML test page (~30 lines) with:
   - "Start" button that captures mic via `getUserMedia`
   - Streams audio to local relay server
   - Plays back AI audio response
   - Displays AI transcript text

### Success criteria:
- Can speak to AI through relay and hear response
- AI transcript text appears
- Latency is acceptable (< 1s round-trip for audio)
- No WebSocket connection issues between browser ↔ relay ↔ Gemini

### If spike fails:
- Option A: Call Gemini directly from browser (like alpha) + use Supabase Edge Functions for server-side operations
- Option B: Different Gemini API endpoint or configuration
- Option C: Fall back to OpenAI Realtime API (has documented relay patterns)

### After spike:
- Document findings (what worked, any gotchas)
- Delete spike branch (code was throwaway)
- Proceed to Plan 1 with confidence

---

## Plan 1: Foundation
**Plan file**: `docs/plans/2026-03-06-foundation.md`
**Issues**: #1, #2, #11, #14, #15, #16
**Branch**: `chore/1-foundation`

### Step 1: Project Scaffolding
- `npx create-next-app@14` with App Router, TypeScript, Tailwind, ESLint
- Create folders: `app/(auth)/`, `app/dashboard/`, `app/interview/`, `app/api/`, `components/ui/`, `components/interview/`, `lib/`, `lib/hooks/`, `lib/stores/`, `server/`, `types/`, `prompts/`, `tests/`
- `tsconfig.json`: `"strict": true`, path aliases (`@/*`)
- Install deps:
  - Production: `@supabase/supabase-js`, `@supabase/ssr`, `@google/genai`, `zustand`, `react-hook-form`, `zod`, `date-fns`, `react-hot-toast`, `lucide-react`, `dompurify`
  - Dev: `jest`, `@testing-library/react`, `@testing-library/jest-dom`, `ts-jest`, `@types/dompurify`
- Relay server: `server/package.json` (`express`, `ws`, `@google/genai`, `dotenv`, `typescript`, `tsx`), `server/tsconfig.json`
- ESLint (`.eslintrc.json`) + Prettier (`.prettierrc`)
- Env templates:
  - `.env.local.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_RELAY_SERVER_URL=ws://localhost:8081`
  - `server/.env.example`: `GOOGLE_AI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT=8081`
- Jest config: `jest.config.ts`
- **Verify**: `npm run build` succeeds

### Step 2: CI/CD Pipeline
- `.github/workflows/ci.yml`: lint → typecheck → test → build (frontend + server)
- **Verify**: Push, CI green

### Step 3: Supabase Schema
- **Migration 1: `interviews`** — id, user_id (FK auth.users), participant_name, topic, status ('active'|'completed'|'analyzed'), transcript JSONB, duration_seconds, created_at, updated_at + indexes on user_id, created_at + RLS
- **Migration 2: `insights`** — id, interview_id (unique FK), validation_score (0-100), pain_points JSONB, themes JSONB, next_steps JSONB, raw_analysis, created_at + index + RLS
- **Migration 3: `ai_logs`** — id, interview_id (FK), event_type, payload JSONB, created_at + index + RLS
- **Migration 4: `updated_at` trigger**
- Generate `types/database.types.ts`
- Create `lib/supabase.ts` (browser), `lib/supabase-server.ts` (SSR), `lib/supabase-admin.ts` (service role)
- **Verify**: RLS policies work

### Step 4: Authentication (Supabase Auth — Google + Email)
- `app/(auth)/login/page.tsx`: email/password form + "Sign in with Google" button
- `app/(auth)/signup/page.tsx`: email/password registration + "Sign up with Google" button
- `lib/hooks/use-auth.ts`: user, session, isLoading, signIn, signUp, signInWithGoogle, signOut
- `lib/auth.ts`: `getAuthUser(request)` — extracts user from session, throws 401
- `middleware.ts`: protect `/dashboard/*`, `/interview/*`, `/api/interview*`
- `components/ui/user-menu.tsx`: email display, sign out
- **Note**: User will configure Google OAuth provider in Supabase dashboard
- **Verify**: Sign up → sign in → access protected route → sign out

### Step 5: Shared Utilities (TDD for validators)
- `lib/logger.ts`: wraps console, no-ops debug/info in production
- `lib/constants.ts`: `INTERVIEW_STATUS`, `MAX_INTERVIEW_DURATION_SECONDS` (900), `INTERVIEW_WARNING_SECONDS` (720), `SILENCE_TIMEOUT_SECONDS` (10), `TRANSCRIPT_SPEAKER`, `WS_RECONNECT_MAX_RETRIES` (5), `RMS_SILENCE_THRESHOLD` (0.01)
- `types/index.ts`: `Interview`, `Insight`, `PainPoint`, `TranscriptEntry`, `AnalysisResult`
- **TDD**: Write `tests/lib/validators.test.ts` first → then implement `lib/validators.ts`
- ~~Rate limiter~~: cut from MVP (0 users). Deferred to post-MVP issue #17.
- **Verify**: All tests green

### Step 6: UI Component Library
- `components/ui/`: `button.tsx`, `card.tsx`, `modal.tsx` (focus trap), `input.tsx`, `badge.tsx` (color+icon), `spinner.tsx`
- `components/ui/toast-provider.tsx`, `components/ui/error-boundary.tsx`
- Wire into `app/layout.tsx`
- **Verify**: Smoke tests, a11y attributes

---

## Plan 2: Mom Test Prompts + Gemini Relay Server
**Plan file**: `docs/plans/2026-03-06-mom-test-relay.md`
**Issues**: #4, #3
**Branch**: `feature/3-mom-test-relay`

### Step 1: System Prompts
- `prompts/momTestEnforcer.md`: `{{TOPIC}}` and `{{TARGET_USER}}` placeholders, Mom Test rules (never leading questions, always past behavior), interview flow (opening→exploration→deep-dive→closing), self-monitoring
  - Adapted for Gemini system instruction format (passed as `systemInstruction` in Live API config)
- `prompts/insightAnalyzer.md`: transcript JSON input, JSON Schema output: `{ validationScore, painPoints[{title,severity,evidence[]}], themes[], nextSteps[], summary, finalVerdict }`
  - Uses Gemini's native JSON Schema structured output (like the alpha)

### Step 2: Prompt Utilities (TDD)
- **TDD**: Write `tests/lib/prompt-loader.test.ts` first → then implement `lib/prompt-loader.ts`
- **TDD**: Write `tests/lib/mom-test.test.ts` first → then implement `lib/mom-test.ts`
  - `buildInterviewPrompt(topic, targetUser)` — note: takes targetUser too (from alpha pattern)
  - `buildAnalysisPrompt(transcript, businessIdea, targetUser)`
  - `detectLeadingQuestion(text): { isLeading, pattern? }`
- **Verify**: All tests green

### Step 3: Relay Server — Gemini Live API (TDD for session-manager)
- `server/types.ts`: `SessionConfig`, `GeminiLiveEvent`, `ServerMessage`, `TranscriptEntry`
- `server/index.ts`: Express, `GET /health`, WebSocket upgrade on `/ws`, CORS, env validation (`GOOGLE_AI_API_KEY` required), graceful shutdown
- `server/gemini-relay.ts`: `GeminiRelay` class (replaces `RealtimeRelay`)
  - Uses `@google/genai` SDK to establish Gemini Live API session
  - Model: `gemini-2.5-flash-native-audio-preview`
  - Injects Mom Test system prompt via `systemInstruction` config
  - Enables `outputAudioTranscription` for AI speech transcription
  - Bidirectional audio forwarding:
    - Client → Gemini: PCM16 audio chunks (from browser mic via relay)
    - Gemini → Client: audio response data (binary, for AudioStreamer playback)
    - Gemini → Client: transcript text (via `outputAudioTranscription`)
  - Logs events to `ai_logs`, runs `detectLeadingQuestion()` on AI transcript text
- **TDD**: Write `tests/server/session-manager.test.ts` first → then implement `server/session-manager.ts`:
  - Maps client WS → { Gemini session, interviewId, transcript[], timers }
  - Duration tracking: warn at 12min, auto-end at 15min
  - **RMS silence detection**: receives RMS values from client, tracks silence duration, auto-ends after 10s continuous silence from both sides
  - **Transcript checkpoint**: PATCH transcript to Supabase every 30s
  - `createSession()`, `endSession()` — on end: final transcript write + **auto-trigger analysis**
- Scripts: `dev: tsx watch index.ts`, `build: tsc`, `start: node dist/index.js`
- **Verify**: All tests green, health returns 200

---

## Plan 3: Interview Flow
**Plan file**: `docs/plans/2026-03-06-interview-flow.md`
**Issues**: #5, #6, #7
**Branch**: `feature/5-interview-flow`

### Step 1: Interview Setup + Consent
- `app/interview/new/page.tsx` (server component)
- `components/interview/interview-setup-form.tsx` (client): React Hook Form + Zod
  - Fields: participant name, business idea/topic, target user description
  - **Consent checkbox** (required): "I confirm the participant has consented to being recorded and transcribed"
  - "Start Interview" button disabled until consent is checked
  - Submit → POST `/api/interview/start` → redirect `/interview/[id]`
- `app/api/interview/start/route.ts`: validate (including consent=true), auth, create interview (status: 'active'), return `{ id }`

### Step 2: Audio Handling (ported from alpha)
- `lib/hooks/use-audio-session.ts`:
  - `requestMicrophoneAccess()`: `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000 } })`
  - Permission denied: toast with instructions
  - Audio capture: `ScriptProcessorNode` (buffer 8192) converts to PCM16 — upgrade path to `AudioWorkletNode` in post-MVP
  - **RMS calculation**: compute RMS of each audio buffer, send to relay for silence detection
  - `playAudioResponse(audioData)`: custom `AudioStreamer` class using Web Audio API (ported from alpha)
  - Cleanup on unmount: release media stream, close AudioContext
- `lib/audio-streamer.ts`: `AudioStreamer` class (ported from alpha) — smooth playback of streaming audio chunks via Web Audio API

### Step 3: Transcription
- **AI speech**: received via relay server (Gemini `outputAudioTranscription`)
- **User speech**: `lib/hooks/use-speech-recognition.ts` — wraps browser `webkitSpeechRecognition` / `SpeechRecognition` API
  - Continuous mode, interim results
  - Fallback: if Speech API not available, show "User speech transcription unavailable" (non-blocking)

### Step 4: WebSocket Hook
- `lib/hooks/use-realtime-session.ts`:
  - Connect to `ws://localhost:8081/ws` (configurable via env)
  - States: idle → connecting → connected → disconnected | error
  - Auto-reconnect: exponential backoff (1s, 2s, 4s, 8s, 16s), max 5 retries
  - Sends: PCM16 audio chunks + RMS values
  - Receives: AI audio data + AI transcript text + session events (warning, timeout, silence-detected)
  - Duration tracking with 12min warning callback
  - Exposes: `connect()`, `disconnect()`, `sendAudio()`, `connectionStatus`, `transcript[]`, `elapsedSeconds`

### Step 5: Interview Store
- `lib/stores/interview-store.ts` (Zustand): interviewId, participantName, topic, targetUser, transcript[], elapsedSeconds, isRecording, aiState, silenceSeconds

### Step 6: Interview UI Components
- `components/interview/transcript-feed.tsx`: auto-scroll, AI=blue/User=gray, DOMPurify, `role="log"` + `aria-live="polite"`
- `components/interview/ai-status-indicator.tsx`: listening/speaking/thinking with icon+color
- `components/interview/session-timer.tsx`: MM:SS, yellow@12min, red@15min
- `components/interview/silence-indicator.tsx`: shows silence counter when > 5s ("Silence: 7s / 10s"), visual warning
- `components/interview/session-controls.tsx`: "End Session" (confirmation modal), mic mute toggle

### Step 7: Live Interview Page
- `app/interview/[id]/page.tsx` (server): fetch interview, validate ownership
- `components/interview/live-interview-view.tsx` (client): split layout, error boundary, on mount: mic→WebSocket→session, on end: disconnect

### Step 8: Save Transcript API
- `app/api/interview/[id]/route.ts`: GET (fetch) + PATCH (save transcript, status='completed', DOMPurify)
- Relay server handles incremental checkpoints + final write + auto-triggers analysis

- **Verify**: Audio capture + playback, speech recognition, silence detection, transcript rendering

---

## User Testing Checkpoint (after Plan 3, before Plan 4)
**Goal**: Validate the core interview experience with real founders before building dashboard + analysis.

**What to test** (with 2 founders):
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

**Action**: Fix critical issues before proceeding. Non-critical feedback goes into GitHub Issues for post-MVP.

---

## Plan 4: Dashboard
**Plan file**: `docs/plans/2026-03-06-dashboard.md`
**Issue**: #8
**Branch**: `feature/8-dashboard`

### Step 1: API
- `app/api/interviews/route.ts`: GET user's interviews, ordered by `created_at DESC`

### Step 2: Dashboard Page
- `app/dashboard/page.tsx` (server): fetch interviews
- `components/interview/interview-card.tsx`: participant, topic, date (date-fns), status badge (Active=blue+Play, Completed=yellow+CheckCircle, Analyzed=green+BarChart), duration, click→navigates
- `components/interview/dashboard-view.tsx`: responsive grid (1/2/3 cols), empty state + CTA, "New Interview" FAB

### Step 3: Landing Page
- `app/page.tsx`: authenticated→redirect `/dashboard`, unauthenticated→redirect `/login`

- **Verify**: Card renders, empty state, responsive layout, only user's data

---

## Plan 5: Analysis Pipeline + Insight Report
**Plan file**: `docs/plans/2026-03-06-analysis-insights.md`
**Issues**: #9, #10
**Branch**: `feature/9-analysis-insights`

### Step 1: Gemini Analysis Wrapper (TDD)
- **TDD**: Write `tests/lib/gemini.test.ts` first (mock SDK, test retry, structured output parsing) → then implement `lib/gemini.ts`:
  - `callGeminiPro(systemPrompt, userContent, jsonSchema): Promise<T>` — uses `@google/genai` SDK
  - Model: `gemini-3.1-pro-preview`
  - Uses JSON Schema for structured output (like alpha — guarantees parseable response)
  - Retry (3x on 429/500), log to `ai_logs`

### Step 2: Analysis Pipeline (TDD)
- **TDD**: Write `tests/server/analysis.test.ts` first → then implement `server/analysis.ts`:
  - `analyzeTranscript(interviewId)`:
    - Read transcript + interview metadata from Supabase
    - Build prompt via `buildAnalysisPrompt(transcript, businessIdea, targetUser)`
    - Call Gemini 3.1 Pro with JSON Schema → parse response
    - Write to `insights` table, update interview status to 'analyzed', log to `ai_logs`
  - Auto-triggered by session-manager on session end

### Step 3: Insight API
- `app/api/interview/[id]/insight/route.ts`: GET insight + interview metadata (verify ownership)

### Step 4: Insight Report Components
- `components/interview/validation-score.tsx`: animated radial SVG progress (0-100), red<40+XCircle, yellow 40-70+AlertTriangle, green>70+CheckCircle, `aria-label`
- `components/interview/pain-point-card.tsx`: expandable, severity badge, evidence blockquotes, keyboard accessible
- `components/interview/next-steps-list.tsx`: ordered list

### Step 5: Report Page
- `app/dashboard/[id]/report/page.tsx` (server): fetch insight + interview, validate ownership
- Layout: validation score → pain points → themes (tags) → next steps → summary → final verdict, "Back to Dashboard"

- **Verify**: ValidationScore colors, PainPointCard expand/collapse, analysis with mocked Gemini

---

## docs/features.md Checklist

```markdown
# Features Checklist

## MVP

### 1.1 Foundation
- [ ] Project scaffolding — Next.js 14, TypeScript strict, Tailwind (#1)
- [ ] CI/CD — GitHub Actions: lint, typecheck, test, build (#16)
- [ ] Supabase schema — interviews, insights, ai_logs + indexes + RLS (#2)
- [ ] Auth — Supabase Google + email login, middleware (#11)
- [ ] Shared utilities — logger, constants, validators, types (#14)
- [ ] UI components — Button, Card, Modal, Input, Badge, Spinner, Toast, ErrorBoundary (#15)

### 1.2 Mom Test + Gemini Relay Server
- [ ] Mom Test system prompt (#4)
- [ ] Insight analysis prompt (#4)
- [ ] Leading question detection (#4)
- [ ] Gemini Live API relay server (#3)
- [ ] Session manager — duration, silence detection, checkpoints, auto-analyze (#3)

### 1.3 Interview Flow
- [ ] Interview Setup screen — participant, business idea, target user (#5)
- [ ] Audio capture — getUserMedia, PCM16, AudioStreamer playback (#6)
- [ ] User speech transcription — Web Speech API (#6)
- [ ] RMS silence detection — 10s auto-end (#6)
- [ ] Live Interview screen — transcript, AI status, timer, controls (#6)
- [ ] Save transcript — incremental checkpoints + final write (#7)

### 1.4 Dashboard
- [ ] Dashboard — card grid, status badges, empty state (#8)

### 1.5 Analysis + Insights
- [ ] Gemini 3.1 Pro analysis with structured JSON output (#9)
- [ ] Auto-analyze on session end (#9)
- [ ] Insight Report — score, pain points, themes, next steps, verdict (#10)

## Post-MVP (GitHub Issues)
- [ ] Production deployment — Vercel + Fly.io (#17)
- [ ] WebSocket reconnection UX (#18)
- [ ] Structured logging & observability (#19)
- [ ] Supabase RPC rate limiting (#20)
- [ ] PDF export (#12)
- [ ] API documentation (#13)
- [ ] Upgrade ScriptProcessorNode → AudioWorkletNode
```

---

## Key Decisions

1. **Gemini over OpenAI**: Teammate's alpha proves Gemini works. Gemini Live API for voice, Gemini 3.1 Pro for analysis. Likely cheaper than OpenAI Realtime API.
2. **Auth first**: Real Supabase Auth in Plan 1 — no mock auth, no retrofitting
3. **Relay server still needed**: Unlike alpha (frontend-only), we proxy Gemini through relay to keep API key server-side, support multi-user, persist data
4. **Local dev only**: No production deployment for MVP
5. **Auto-analyze**: Session end → auto-trigger Gemini 3.1 Pro analysis
6. **Dual end conditions**: RMS silence (10s) + timer (12min warn, 15min auto-end)
7. **Dual transcription**: AI via Gemini `outputAudioTranscription`, user via Web Speech API
8. **Incremental transcript checkpoints**: Every 30s to Supabase
9. **JSON Schema structured output**: Gemini 3.1 Pro returns guaranteed-parseable JSON (no Zod parsing needed, but validate anyway)
10. **Strict TDD for `/lib` and `/server`**: Tests BEFORE implementation. UI gets smoke tests after.
11. **No rate limiting for MVP**: 0 users, not needed. Deferred to post-MVP (#17).
12. **Teammate joins this repo**: Ports audio/Gemini code from alpha into relay server + Next.js architecture.

## Definition of Done (per plan)
- All tests passing (TDD for lib/server, smoke for UI)
- CI green (lint + typecheck + test + build)
- Code committed and pushed to feature branch
- PR created and merged to `development`
- No TypeScript errors, no ESLint warnings

## TDD Methodology

**Strict TDD (tests first) for:**
`lib/validators.ts`, `lib/mom-test.ts`, `lib/prompt-loader.ts`, `lib/auth.ts`, `lib/gemini.ts`, `server/gemini-relay.ts`, `server/session-manager.ts`, `server/analysis.ts`

**Smoke tests (after) for:**
All `components/ui/*` and `components/interview/*`

**Coverage target**: >= 70% on `/lib` and `/server`

## Prerequisites (User Setup Required)

### Before Plan 1:
- **Supabase**: Project provisioned. User configures Google OAuth in dashboard at Step 4.

### Before Plan 2:
- **Google AI API key**: User needs to:
  1. Go to [Google AI Studio](https://aistudio.google.com/) or Google Cloud Console
  2. Create an API key with access to Gemini models
  3. Ensure access to `gemini-2.5-flash-native-audio-preview` (Live API) and `gemini-3.1-pro-preview`
  4. Add to `server/.env` as `GOOGLE_AI_API_KEY`

---

## Local Dev Setup

```
Terminal 1: cd server && npm run dev    → relay on localhost:8081
Terminal 2: npm run dev                 → Next.js on localhost:3000
```

Required env vars:
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_RELAY_SERVER_URL=ws://localhost:8081`
- `server/.env`: `GOOGLE_AI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT=8081`

---

## Verification (End-to-End)

1. Sign up (email or Google) → sign in → land on dashboard
2. Create interview (participant, business idea, target user) → mic permission → conduct voice interview → real-time transcript (both sides)
3. Silence for 10s → auto-ends OR hit "End Session" → auto-analysis triggers
4. Dashboard shows "Analyzed" → click into report → validation score, pain points, themes, next steps, verdict
5. Auth isolation: user A can't see user B's data
6. Mom Test: AI never asks leading questions
7. CI green on push
