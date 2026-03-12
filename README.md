# Digital Entrepreneurs — AI-Powered Mom Test Validation

Automates startup validation through real-time Voice AI interviews that strictly enforce the [Mom Test](http://momtestbook.com/) framework, then analyzes transcripts to extract validated pain points and insights.

## Links

| | |
|---|---|
| **GitHub** | https://github.com/Daiki007121/Digital-Entrepreneurs-AI-Powered-Mom-Test-Validation |
| **Production** | https://digital-entrepreneurs.vercel.app |
| **Eval Dashboard** | https://digital-entrepreneurs.vercel.app/eval-dashboard.html |
| **Demo Video** | https://youtu.be/9v_44T3XTT0 |
| **Blog Post** | https://medium.com/@daiki007121/building-an-ai-powered-mom-test-interviewer-real-time-ai-for-startup-validation-53a79292e0ce |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Relay Server | Node.js, Express, WebSocket (`ws`) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth + email/password) |
| Voice AI | Google Gemini Live API (`gemini-2.5-flash-native-audio-latest`) |
| Analysis AI | Google Gemini (`gemini-2.5-flash`) |
| SDK | `@google/genai` |

## Architecture

```
Browser (React)  ←— WebSocket —→  Relay Server (Node.js)  ←— Gemini Live API —→  Google Gemini
       ↕                                    ↕
   Supabase Auth                      Supabase DB
```

The relay server bridges the client and Gemini Live API — the Google AI API key never touches the browser.

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9 (`npm install -g pnpm`)
- **Supabase** account with a project set up (see [Database Setup](#database-setup))
- **Google AI API key** with Gemini access (get one at [Google AI Studio](https://aistudio.google.com/apikey))

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Daiki007121/Digital-Entrepreneurs-AI-Powered-Mom-Test-Validation.git
cd Digital-Entrepreneurs-AI-Powered-Mom-Test-Validation

# Install frontend dependencies
pnpm install

# Install relay server dependencies
cd server && pnpm install && cd ..
```

### 2. Environment variables

Create **two** env files:

**Root `.env.local`** (Next.js frontend):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_RELAY_SERVER_URL=ws://localhost:8081
```

**`server/.env`** (Relay server):

```env
GOOGLE_AI_API_KEY=<your-google-ai-api-key>
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
PORT=8081
```

> Find your Supabase keys in **Project Settings > API** in the Supabase dashboard.

### 3. Database Setup

The app requires three tables in your Supabase project: `interviews`, `insights`, and `ai_logs`. Create them via the Supabase SQL Editor:

```sql
-- Interviews table
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  participant_name TEXT NOT NULL,
  topic TEXT NOT NULL CHECK (char_length(topic) <= 100),
  target_user TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'analyzed')),
  transcript JSONB DEFAULT '[]'::jsonb,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insights table (one-to-one with interviews)
CREATE TABLE public.insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL UNIQUE REFERENCES public.interviews(id),
  validation_score INTEGER NOT NULL CHECK (validation_score >= 0 AND validation_score <= 100),
  pain_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_analysis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI logs table (debugging)
CREATE TABLE public.ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id),
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies (users can only access their own data)
CREATE POLICY "Users can view own interviews" ON public.interviews
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interviews" ON public.interviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own interviews" ON public.interviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own insights" ON public.insights
  FOR SELECT USING (interview_id IN (SELECT id FROM public.interviews WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access interviews" ON public.interviews
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access insights" ON public.insights
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access ai_logs" ON public.ai_logs
  FOR ALL USING (auth.role() = 'service_role');
```

Also enable **Google OAuth** (or email/password) in **Supabase > Authentication > Providers**.

### 4. Run both servers

You need **two terminals**:

**Terminal 1 — Next.js frontend** (port 3000):

```bash
pnpm dev
```

**Terminal 2 — Relay server** (port 8081):

```bash
cd server
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Verify the relay server

```bash
curl http://localhost:8081/health
# Expected: {"status":"ok","uptime":...}
```

## How It Works

1. **Sign in** via Supabase Auth (Google OAuth or email/password)
2. **Create an interview** — enter participant name, topic, and target user description
3. **Live interview** — the AI interviewer speaks first, conducts a Mom Test interview via voice. Real-time transcript appears on screen.
4. **End session** — transcript is saved to Supabase, AI analysis runs automatically
5. **View insights** — dashboard shows interview cards; click into an analyzed interview to see validation score, pain points, themes, and recommended next steps

## Project Structure

```
app/                    # Next.js App Router pages
  ├── auth/             # Login/signup pages
  ├── dashboard/        # Interview dashboard
  ├── interview/        # Interview setup + live session
  └── api/              # API routes (interview CRUD)
components/
  ├── ui/               # Reusable UI components (badge, spinner, error-boundary)
  └── interview/        # Interview-specific components (transcript, controls, dashboard)
lib/
  ├── hooks/            # Custom hooks (use-audio-session, use-realtime-session)
  ├── stores/           # Zustand stores (interview-store)
  ├── gemini.ts         # Gemini analysis client
  ├── supabase.ts       # Supabase client factories
  └── constants.ts      # Shared constants
server/
  ├── index.ts          # Express + WebSocket server entry
  ├── gemini-relay.ts   # Gemini Live API bridge
  ├── session-manager.ts # Session lifecycle (timers, silence detection, transcript saving)
  └── analysis.ts       # Post-interview AI analysis trigger
prompts/                # System prompts (Mom Test enforcer)
types/                  # TypeScript interfaces
tests/                  # Jest + React Testing Library tests
```

## Scripts

### Frontend (root)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Run Jest tests |
| `pnpm test:coverage` | Run tests with coverage |

### Relay Server (`server/`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start with hot reload (`tsx watch`) |
| `pnpm build` | Compile TypeScript |
| `pnpm start` | Run compiled JS |
| `pnpm typecheck` | TypeScript type checking |

## Testing

```bash
# Frontend tests
pnpm test

# Type checking (both)
pnpm typecheck
cd server && pnpm typecheck
```

## Known Limitations (MVP)

- Audio uses `ScriptProcessorNode` (deprecated) — will migrate to `AudioWorkletNode` (#18)
- No audio recording/playback of sessions (#19)
- No rate limiting (#17)
- Transcript quality depends on Gemini's speech-to-text accuracy
- Local development only — production deployment planned (#14)

## Contributing

1. Branch from `development`: `git checkout -b feature/<issue>-description`
2. Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat(ui): add interview timer`
3. Reference issues: `// Implements #<issue-number>: <title>`
4. PR into `development`, squash merge

See [CLAUDE.md](CLAUDE.md) for full coding standards and architecture rules.
