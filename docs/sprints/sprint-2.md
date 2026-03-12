# Sprint 2: Stabilization, UX Polish, and Production Readiness

## Sprint Overview
- **Duration:** March 8–13, 2026
- **Goal:** Fix critical bugs from user testing, improve audio quality and interview UX, achieve test coverage, prepare documentation and deployment
- **Team:** 2 developers (Daiki + Jason)

## Sprint Planning

### Sprint Backlog

| Issue | Title | Labels | Owner | Status |
|-------|-------|--------|-------|--------|
| #30 | [FIX] Audio latency — dynamic sample rate + buffer optimization | bug | Daiki | Done |
| #31 | [FIX] Turn-complete signaling — reduce Gemini response delay | bug | Daiki | Done |
| #32 | [FIX] Auto-end bug — silence timer fires before user speaks | bug | Daiki | Done |
| #33 | [FIX] Login/signup input text invisible | bug | Daiki | Done |
| #34 | [DOCS] Sprint planning + retrospective documents | docs | Daiki | Done |
| #35 | [DOCS] AI Mastery — multi-modality usage log | docs | Daiki | Done |
| #36 | [DOCS] Technical blog post (1500 words) | docs | Daiki | Done |
| #37 | [CHORE] Add .env.example files | chore | Daiki | Done |
| #13 | [DOCS] API documentation | docs, priority:medium | Jason | Done |
| #14 | [CHORE] Production deployment — Vercel + Fly.io | enhancement | Jason | Done |

### Carried Over from Sprint 1 Backlog (Post-MVP)

| Issue | Title | Labels | Status |
|-------|-------|--------|--------|
| #12 | [FEATURE] Export Insight Report as PDF | feature, priority:medium | Backlog |
| #15 | [FEATURE] WebSocket reconnection UX | enhancement | Backlog |
| #16 | [FEATURE] Structured logging & observability | enhancement | Backlog |
| #17 | [CHORE] Supabase RPC rate limiting | enhancement | Backlog |
| #18 | [CHORE] Upgrade ScriptProcessorNode to AudioWorkletNode | enhancement | Backlog |
| #19 | [FEATURE] Interview audio recording & storage | enhancement | Backlog |
| #20 | [FEATURE] Multiple interview templates | enhancement | Backlog |

### User Stories (Sprint 2)

| User Story | Acceptance Criteria | Related Issues |
|-----------|---------------------|----------------|
| As a founder, I experience low-latency natural conversation | Dynamic sample rate detection; 2048 buffer; continuous streaming; turn-complete signaling | #30, #31 |
| As a user, my session does not end prematurely | Silence timer only starts after user speaks; pauses during AI playback | #32 |
| As a user, I can see my input when logging in | Auth form inputs have visible text color | #33 |
| As a reviewer, I can read sprint planning and retrospective docs | Sprint 1 + 2 docs with user stories, acceptance criteria, and retros | #34 |
| As a reviewer, I can evaluate AI tool usage across the project | AI Mastery doc covers all modalities with specific examples | #35 |
| As a reviewer, I can read a technical blog post about the project | 1500+ word post covering architecture, challenges, and lessons | #36 |
| As a new contributor, I can set up the project locally | .env.example files for both frontend and relay server | #37 |

### Task Assignments

| Task | Owner |
|------|-------|
| Audio latency + turn detection fixes (PR #29) | Daiki |
| Login UI fix (PR #29) | Daiki |
| Sprint planning + retrospective documents | Daiki |
| AI Mastery documentation | Daiki |
| Technical blog post | Daiki |
| .env.example files | Daiki |
| 10-minute demo video | Daiki |
| Production deployment (Vercel + Fly.io) | Jason |
| Test coverage push (80%+) | Jason |
| CI/CD upgrades (coverage reporting, security scan) | Jason |
| API documentation | Jason |

---

## Sprint 2 Retrospective

### What Went Well
- **User testing surfaced real bugs.** Testing the live interview revealed the sample rate mismatch (Mac browsers record at 48kHz, not 24kHz), premature session termination, and invisible login text. None were caught by automated tests — only real-device testing found them.
- **Audio pipeline significantly improved.** Dynamic sample rate detection, smaller buffer (8192 → 2048), continuous streaming, and explicit turn-complete signaling made conversations feel noticeably more natural.
- **Cursor Bugbot caught issues in PR review.** Automated review of PR #29 identified a verbose `console.log` that would flood production logs and an RMS threshold mismatch between client (0.01) and server (0.05). Both fixed before merge.
- **Clear task split improved parallelism.** Daiki handled bug fixes + all documentation; Jason handled deployment + tests + CI/CD. No merge conflicts or duplicated work.
- **All Sprint 2 issues completed.** #30–#37 closed, #13 and #14 completed by Jason.

### What Didn't Go Well
- **Documentation compressed to end of sprint.** Blog post, sprint docs, AI mastery log, and demo video were all done in the final days. Starting documentation earlier would have reduced time pressure.
- **Test coverage was the biggest bottleneck.** Reaching 80%+ required writing tests for ~65 source files. Even with Claude Code, this was the most time-consuming single task.

### Key Metrics
- **Issues closed this sprint:** 10 (#13, #14, #30–#37)
- **PRs merged:** #26 (bug fixes), #27 (UX overhaul + README), #28 (merge to main), #29 (audio latency)
- **Daiki's contributions:** PR #29 (4 bug fixes), 4 documentation deliverables
- **Jason's contributions:** Production deployment, test coverage, CI/CD, API docs

### Lessons Learned
1. **Test with real hardware early.** The 24kHz hardcoding bug would have been caught immediately if tested on a Mac during Sprint 1.
2. **Budget documentation time upfront.** A 200-point rubric with 15 pts for docs + 30 pts for AI mastery + 20 pts for sprint docs = 65 pts of pure writing. This needs dedicated time, not leftover hours.
3. **Automated PR review adds value.** Cursor Bugbot's review caught two legitimate issues that human review might have missed under deadline pressure.
