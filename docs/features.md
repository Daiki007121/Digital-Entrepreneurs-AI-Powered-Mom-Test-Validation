# Features Checklist

## MVP

### 1.1 Foundation (Plan 1)
- [ ] Project scaffolding — Next.js 14, TypeScript strict, Tailwind (#1)
- [ ] CI/CD — GitHub Actions: lint, typecheck, test, build (#16)
- [ ] Supabase schema — interviews, insights, ai_logs + indexes + RLS (#2)
- [ ] Auth — Supabase Google + email login, middleware (#11)
- [ ] Shared utilities — logger, constants, validators, types (#14)
- [ ] UI components — Button, Card, Modal, Input, Badge, Spinner, Toast, ErrorBoundary (#15)

### 1.2 Mom Test + Gemini Relay Server (Plan 2)
- [ ] Mom Test system prompt (#4)
- [ ] Insight analysis prompt (#4)
- [ ] Leading question detection (#4)
- [ ] Gemini Live API relay server (#3)
- [ ] Session manager — duration, silence detection, checkpoints, auto-analyze (#3)

### 1.3 Interview Flow (Plan 3)
- [ ] Interview Setup screen — participant, business idea, target user, consent (#5)
- [ ] Audio capture — getUserMedia, PCM16, AudioStreamer playback (#6)
- [ ] User speech transcription — Web Speech API (#6)
- [ ] RMS silence detection — 10s auto-end (#6)
- [ ] Live Interview screen — transcript, AI status, timer, controls (#6)
- [ ] Save transcript — incremental checkpoints + final write (#7)

### 1.4 Dashboard (Plan 4)
- [ ] Dashboard — card grid, status badges, empty state (#8)

### 1.5 Analysis + Insights (Plan 5)
- [ ] Gemini 3.1 Pro analysis with structured JSON output (#9)
- [ ] Auto-analyze on session end (#9)
- [ ] Insight Report — score, pain points, themes, next steps, verdict (#10)

## Post-MVP (GitHub Issues)
- [ ] Production deployment — Vercel + Fly.io (#14)
- [ ] WebSocket reconnection UX (#15)
- [ ] Structured logging & observability (#16)
- [ ] Supabase RPC rate limiting (#17)
- [ ] Upgrade ScriptProcessorNode to AudioWorkletNode (#18)
- [ ] Interview audio recording & storage (#19)
- [ ] Multiple interview templates (#20)
- [ ] Export Insight Report as PDF (#12)
- [ ] API documentation (#13)
