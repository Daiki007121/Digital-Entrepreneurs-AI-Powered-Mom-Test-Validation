# Product Requirements Document (PRD)

## Product Vision
"Digital Entrepreneurs" automates the startup validation process.
- Phase 1 (MVP): Real-time Voice AI that strictly enforces the "Mom Test" interview framework
- Phase 2 (MVP): AI transcript analysis to validate core pain points and produce insight reports
- Phase 3 (Future): Auto-generate and deploy a SaaS solution based on validated pain points

## User Stories (Sprint 1)
- As a founder, I can start a voice interview session so that I can gather unbiased user feedback
- As a founder, I can see a real-time transcript during the interview so that I know the AI is on track
- As a founder, I can end a session and have the transcript automatically saved
- As a founder, I can view a list of past interview sessions on my dashboard

## User Stories (Sprint 2)
- As a founder, I can trigger AI analysis on a saved transcript so that I receive validated pain points
- As a founder, I can view an insight report with key themes and a validation score
- As a founder, I can export the insight report as PDF

## Mockup / Design Guidance
Mockups live in `/docs/mockups/` (Figma export PNGs)

Key screens:
1. **Interview Setup Screen** — Single CTA "Start Interview", shows participant name field and topic selector
2. **Live Interview Screen** — Split: left = real-time transcript scroll, right = AI status indicator (listening / speaking / thinking). Red "End Session" button bottom-right.
3. **Dashboard** — Card grid of past sessions (date, participant, status: analyzed / pending). "New Interview" FAB.
4. **Insight Report Screen** — Top: validation score badge. Middle: pain point list with evidence quotes. Bottom: recommended next steps.

### UI Component Behavior
- `<TranscriptFeed />` — auto-scrolls to bottom; new AI utterances highlighted in blue, user in gray
- `<ValidationScore />` — animated radial progress bar (0–100); color: red < 40, yellow 40–70, green > 70
- `<PainPointCard />` — expandable; shows evidence quotes on expand
- All modals use a shared `<Modal />` component with focus trap
