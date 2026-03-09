# Digital Entrepreneurs MVP — Claude Code Instructions

## Project Overview
"Digital Entrepreneurs" automates the startup validation process.
- Phase 1 (MVP): Real-time Voice AI enforcing the "Mom Test" interview framework
- Phase 2 (MVP): AI transcript analysis to validate pain points and produce insight reports
- Phase 3 (Future): Auto-generate and deploy a SaaS solution based on validated pain points

## Tech Stack
- Frontend: Next.js 14 (App Router), React 18, Tailwind CSS
- Backend: Node.js (Express), WebSocket (ws library)
- Database: Supabase (PostgreSQL)
- AI: Google Gemini — `gemini-2.5-flash-native-audio-preview` (Gemini Live API) for voice, `gemini-3.1-pro-preview` for analysis
- SDK: `@google/genai`
- Auth: Supabase Auth (Google OAuth + email/password)
- Deployment: Vercel (frontend) + Fly.io (Node.js relay server)

## Folder Structure
```
/
├── app/                   # Next.js App Router pages
├── components/            # Reusable React components (ui/ + interview/)
├── lib/                   # Shared utilities (gemini.ts, supabase.ts, mom-test.ts)
│   ├── hooks/             # Custom React hooks
│   └── stores/            # Zustand stores
├── server/                # Node.js/WebSocket relay server (proxies Gemini Live API)
├── types/                 # TypeScript interfaces / Supabase gen types
├── prompts/               # System prompts as .md files
└── tests/                 # Jest + React Testing Library
```

## Naming Conventions
- Files/folders: kebab-case
- React components: PascalCase
- Variables/functions: camelCase
- Supabase tables: lowercase, plural noun (e.g., users, interviews, insights)
- API routes: /api/[resource]/[action]
- Env vars: SCREAMING_SNAKE_CASE, prefixed with NEXT_PUBLIC_ for client-side

## Coding Standards
- TypeScript strict mode everywhere (`"strict": true`)
- No `any` types — use `unknown` + type guards
- Async/await over raw Promises; always handle errors with try/catch
- No magic strings — use constants or enums
- Components under 150 lines; extract hooks for logic > 30 lines
- All system prompts live in `/prompts/` — never hardcoded inline
- Write JSDoc comments for all exported functions in `/lib` and `/server`

## Preferred Libraries
- HTTP client: native `fetch` (not axios)
- AI SDK: `@google/genai` (Google Gemini)
- Forms: React Hook Form + Zod
- State: Zustand (global), useState/useReducer (local)
- Dates: date-fns
- Notifications: react-hot-toast
- Icons: lucide-react

## Architecture Rules
- Never call Gemini API directly from Next.js API routes — always go through the relay server
- Never expose Google AI API key to client — relay server only
- Use React Server Components for data-fetching; Client Components only when interactivity needed
- Don't store audio files in Supabase Database — use Supabase Storage (URLs/references only)
- Don't mix business logic into React components — keep components presentational
- Handle WebSocket disconnects gracefully (auto-reconnect with exponential backoff)
- Don't skip error boundaries on the interview screen
- Don't use `alert()` — use the toast notification system
- Don't use `console.log` in production — use the shared logger utility
- Log all AI tool calls and model responses to Supabase for debugging

## Security
- Sanitize all transcript text before storing (DOMPurify, prevent XSS)
- Rate-limit `/api/interview/start` to 10 req/min per user (post-MVP, see #17)
- Validate session ownership before serving transcript data
- Validate all user inputs server-side (Zod schemas)
- Never commit `.env.local` or files containing API keys

## Accessibility
- All interactive elements must have aria-labels
- Interview screen must work with keyboard navigation
- Color is never the sole indicator of state (add icons alongside colors)
- Minimum contrast ratio: 4.5:1 (WCAG AA)

## Testing
- Framework: Jest + React Testing Library
- Strict TDD (tests first) for: `/lib` and `/server`
- Smoke tests (after) for: UI components
- Integration tests: API routes (supertest)
- E2E: Playwright for critical paths
- Coverage goal: 70% on `/lib` and `/server`; smoke tests for UI components

## Git Workflow
- Branch naming: `feature/<issue>-description`, `bugfix/<issue>-description`, `chore/<issue>-description`, `hotfix/<issue>-description`
- Commit format: `<type>(<scope>): <short description>` (Conventional Commits)
  - Types: feat | fix | chore | docs | test | refactor | style
  - Scopes: ui | server | db | prompts | auth | ci
- PR body must include: `Closes #<issue-number>`, screenshots for UI changes, test results
- Squash merge to main; delete branch after merge
- Reference issues in code: `// Implements #<issue-number>: <title>`

## Mom Test Enforcement (Critical)
The voice AI must:
- NEVER ask "Would you use this?" or "Do you like this idea?"
- ALWAYS pivot to "Tell me about the last time you experienced X"
- Flag and log any leading questions it accidentally produces
- Keep interview to 10-15 minutes max (warn at 12 min)
- Reference: `/prompts/momTestEnforcer.md`

## PRD
Full PRD: `/docs/PRD.md`
