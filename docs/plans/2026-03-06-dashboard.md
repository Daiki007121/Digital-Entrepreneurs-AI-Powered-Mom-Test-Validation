# Plan 4: Dashboard

**Issue**: #8
**Branch**: `feature/8-dashboard`

## Step 1: API
- `app/api/interviews/route.ts`: GET user's interviews, ordered by `created_at DESC`

## Step 2: Dashboard Page
- `app/dashboard/page.tsx` (server): fetch interviews
- `components/interview/interview-card.tsx`: participant, topic, date (date-fns), status badge (Active=blue+Play, Completed=yellow+CheckCircle, Analyzed=green+BarChart), duration, click -> navigates
- `components/interview/dashboard-view.tsx`: responsive grid (1/2/3 cols), empty state + CTA, "New Interview" FAB

## Step 3: Landing Page
- `app/page.tsx`: authenticated -> redirect `/dashboard`, unauthenticated -> redirect `/login`

**Verify**: Card renders, empty state, responsive layout, only user's data

## Definition of Done
- All tests passing
- CI green (lint + typecheck + test + build)
- Code committed and pushed to feature branch
- PR created and merged to `development`
- No TypeScript errors, no ESLint warnings
