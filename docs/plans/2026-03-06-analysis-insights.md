# Plan 5: Analysis Pipeline + Insight Report

**Issues**: #9, #10
**Branch**: `feature/9-analysis-insights`

## Step 1: Gemini Analysis Wrapper (TDD)
- **TDD**: Write `tests/lib/gemini.test.ts` first (mock SDK, test retry, structured output parsing) -> then implement `lib/gemini.ts`:
  - `callGeminiPro(systemPrompt, userContent, jsonSchema): Promise<T>` — uses `@google/genai` SDK
  - Model: `gemini-3.1-pro-preview`
  - Uses JSON Schema for structured output (guarantees parseable response)
  - Retry (3x on 429/500), log to `ai_logs`

## Step 2: Analysis Pipeline (TDD)
- **TDD**: Write `tests/server/analysis.test.ts` first -> then implement `server/analysis.ts`:
  - `analyzeTranscript(interviewId)`:
    - Read transcript + interview metadata from Supabase
    - Build prompt via `buildAnalysisPrompt(transcript, businessIdea, targetUser)`
    - Call Gemini 3.1 Pro with JSON Schema -> parse response
    - Write to `insights` table, update interview status to 'analyzed', log to `ai_logs`
  - Auto-triggered by session-manager on session end

## Step 3: Insight API
- `app/api/interview/[id]/insight/route.ts`: GET insight + interview metadata (verify ownership)

## Step 4: Insight Report Components
- `components/interview/validation-score.tsx`: animated radial SVG progress (0-100), red<40+XCircle, yellow 40-70+AlertTriangle, green>70+CheckCircle, `aria-label`
- `components/interview/pain-point-card.tsx`: expandable, severity badge, evidence blockquotes, keyboard accessible
- `components/interview/next-steps-list.tsx`: ordered list

## Step 5: Report Page
- `app/dashboard/[id]/report/page.tsx` (server): fetch insight + interview, validate ownership
- Layout: validation score -> pain points -> themes (tags) -> next steps -> summary -> final verdict, "Back to Dashboard"

**Verify**: ValidationScore colors, PainPointCard expand/collapse, analysis with mocked Gemini

## Definition of Done
- All tests passing (TDD for lib/server, smoke for UI)
- CI green (lint + typecheck + test + build)
- Code committed and pushed to feature branch
- PR created and merged to `development`
- No TypeScript errors, no ESLint warnings
