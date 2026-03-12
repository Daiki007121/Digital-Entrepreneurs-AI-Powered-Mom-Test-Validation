# Sprint 1: Core MVP Build

## Sprint Overview
- **Duration:** March 6–7, 2026
- **Goal:** Build a fully functional Mom Test interview application from scratch — foundation through insight reports
- **Team:** 2 developers (Daiki + Jason)

## Sprint Planning

### Sprint Backlog

| Issue | Title | Labels | Owner | Status |
|-------|-------|--------|-------|--------|
| #1 | [CHORE] Repository & project scaffolding | chore, priority:high | Jason | Done |
| #2 | [CHORE] MongoDB connection and base models (→ migrated to Supabase) | chore, priority:high | Jason | Done |
| #3 | [FEATURE] OpenAI Realtime API relay server (→ migrated to Gemini) | feature, priority:high | Jason | Done |
| #4 | [FEATURE] Mom Test system prompt and enforcement logic | feature, priority:high | Daiki | Done |
| #5 | [FEATURE] Interview Setup screen (UI) | feature, priority:high | Jason | Done |
| #6 | [FEATURE] Live Interview screen with real-time transcript | feature, priority:high | Jason | Done |
| #7 | [FEATURE] Save transcript to DB after session | feature, priority:high | Jason | Done |
| #8 | [FEATURE] Dashboard — session list | feature, priority:high | Jason | Done |
| #9 | [FEATURE] AI transcript analysis pipeline | feature, priority:high | Jason | Done |
| #10 | [FEATURE] Insight Report screen | feature, priority:high | Jason | Done |
| #11 | [FEATURE] Authentication (sign up / login) | feature, priority:medium | Jason | Done |

### User Stories

| User Story | Acceptance Criteria | Related Issues |
|-----------|---------------------|----------------|
| As a founder, I can sign up and log in so that my interviews are private | Email/password + Google OAuth; middleware protects routes; user menu with sign out | #1, #2, #11 |
| As a founder, I can start a voice interview session | Setup form collects participant name, topic, target user; consent checkbox; creates record in Supabase | #5 |
| As a founder, I can have a real-time voice conversation with an AI that follows Mom Test principles | Gemini Live API streams audio bidirectionally through relay; AI never asks leading questions | #3, #4 |
| As a founder, I can see a real-time transcript during the interview | AI speech via Gemini outputAudioTranscription; user speech via Web Speech API; auto-scrolling feed | #6 |
| As a founder, I can end a session and have the transcript saved | End Session with confirmation; silence auto-end; transcript checkpointed every 30s | #7 |
| As a founder, I can view past interview sessions on my dashboard | Card grid with name, topic, date, status badge, duration; responsive; empty state | #8 |
| As a founder, I can receive AI analysis with validated pain points | Auto-analysis on session end via Gemini 3.1 Pro; structured JSON output | #9 |
| As a founder, I can view an insight report with themes and a validation score | Animated score (0–100), expandable pain point cards with evidence, next steps, verdict | #10 |

### Key Decisions Made During Sprint 1
- **Gemini over OpenAI:** Jason's working alpha proved Gemini Live API viability; adopted as AI provider
- **Supabase over MongoDB:** Switched to Supabase for integrated auth + PostgreSQL + RLS
- **Relay server architecture:** API key stays server-side; enables multi-user + persistence
- **TDD for core logic:** Tests written first for validators, mom-test, prompt-loader, gemini, session-manager

---

## Sprint 1 Retrospective

### What Went Well
- **Full MVP completed in 2 days.** All 11 issues (#1–#11) closed. The dependency graph (Plan 0 → Plan 1 → Plan 2 → Plan 3 → Plan 4 → Plan 5) kept work sequential and conflict-free.
- **Gemini relay spike validated architecture.** Plan 0 throwaway prototype confirmed the relay approach before production code was written — the highest-risk item resolved first.
- **TDD caught edge cases early.** Writing tests first for `validators.ts`, `mom-test.ts`, `prompt-loader.ts`, `gemini.ts`, and `session-manager.ts` gave confidence during rapid iteration.
- **Clean PR workflow.** Feature branches (`chore/1-foundation`, `feature/3-mom-test-relay`, `feature/5-interview-flow`, `feature/8-dashboard`, `feature/9-analysis-insights`) merged cleanly via PRs #21–#25.
- **CI green from day one.** Lint → typecheck → test → build on every push.

### What Didn't Go Well
- **Most PRs landed on the same day (Mar 7).** Code review was minimal — mostly self-merges to maintain velocity.
- **ScriptProcessorNode is deprecated.** Used deprecated API from alpha to ship faster. Tracked in Issue #18.
- **Skipped user testing checkpoint.** Master plan included testing after Plan 3, but skipped for speed. Audio issues were discovered later in Sprint 2.

### Action Items for Sprint 2
- [ ] Conduct real user testing with full flow
- [ ] Fix audio/UX issues from testing
- [ ] Address CI/CD gaps (coverage reporting, security scanning)
- [ ] Begin production deployment
