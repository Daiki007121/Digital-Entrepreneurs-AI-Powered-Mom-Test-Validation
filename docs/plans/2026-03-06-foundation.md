# Plan 1: Foundation

**Issues**: #1, #2, #11
**Branch**: `chore/1-foundation`

## Step 1: Project Scaffolding
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

## Step 2: CI/CD Pipeline
- `.github/workflows/ci.yml`: lint -> typecheck -> test -> build (frontend + server)
- **Verify**: Push, CI green

## Step 3: Supabase Schema

### Migration 1: `interviews`
```sql
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  topic TEXT NOT NULL CHECK (char_length(topic) <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','analyzed')),
  transcript JSONB DEFAULT '[]'::jsonb,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_interviews_user_id ON interviews(user_id);
CREATE INDEX idx_interviews_created_at ON interviews(created_at DESC);
-- RLS: users can only access their own interviews
```

### Migration 2: `insights`
```sql
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL UNIQUE REFERENCES interviews(id) ON DELETE CASCADE,
  validation_score INTEGER NOT NULL CHECK (validation_score BETWEEN 0 AND 100),
  pain_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_analysis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_insights_interview_id ON insights(interview_id);
-- RLS: users can only access insights for their own interviews
```

### Migration 3: `ai_logs`
```sql
CREATE TABLE ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES interviews(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_logs_interview_id ON ai_logs(interview_id);
-- RLS: users can only access logs for their own interviews
```

### Migration 4: `updated_at` trigger
- Auto-update `updated_at` on interviews table

### Post-migration
- Generate `types/database.types.ts`
- Create `lib/supabase.ts` (browser), `lib/supabase-server.ts` (SSR), `lib/supabase-admin.ts` (service role)
- **Verify**: RLS policies work

## Step 4: Authentication (Supabase Auth)
- `app/(auth)/login/page.tsx`: email/password form + "Sign in with Google" button
- `app/(auth)/signup/page.tsx`: email/password registration + "Sign up with Google" button
- `lib/hooks/use-auth.ts`: user, session, isLoading, signIn, signUp, signInWithGoogle, signOut
- `lib/auth.ts`: `getAuthUser(request)` — extracts user from session, throws 401
- `middleware.ts`: protect `/dashboard/*`, `/interview/*`, `/api/interview*`
- `components/ui/user-menu.tsx`: email display, sign out
- **Note**: User will configure Google OAuth provider in Supabase dashboard
- **Verify**: Sign up -> sign in -> access protected route -> sign out

## Step 5: Shared Utilities (TDD)
- `lib/logger.ts`: wraps console, no-ops debug/info in production
- `lib/constants.ts`: `INTERVIEW_STATUS`, `MAX_INTERVIEW_DURATION_SECONDS` (900), `INTERVIEW_WARNING_SECONDS` (720), `SILENCE_TIMEOUT_SECONDS` (10), `TRANSCRIPT_SPEAKER`, `WS_RECONNECT_MAX_RETRIES` (5), `RMS_SILENCE_THRESHOLD` (0.01)
- `types/index.ts`: `Interview`, `Insight`, `PainPoint`, `TranscriptEntry`, `AnalysisResult`
- **TDD**: Write `tests/lib/validators.test.ts` first -> then implement `lib/validators.ts`
- **Verify**: All tests green

## Step 6: UI Component Library
- `components/ui/`: `button.tsx`, `card.tsx`, `modal.tsx` (focus trap), `input.tsx`, `badge.tsx` (color+icon), `spinner.tsx`
- `components/ui/toast-provider.tsx`, `components/ui/error-boundary.tsx`
- Wire into `app/layout.tsx`
- **Verify**: Smoke tests, a11y attributes

## Definition of Done
- All tests passing (TDD for lib/server, smoke for UI)
- CI green (lint + typecheck + test + build)
- Code committed and pushed to feature branch
- PR created and merged to `development`
- No TypeScript errors, no ESLint warnings
