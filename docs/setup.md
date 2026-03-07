Reusable CLAUDE.md — Plan-Driven Development Workflow

# CLAUDE.md — [Project Name]

## Identity

You are the lead engineer building [Project Name]. [One-line description.]

## Project Context

- `docs/PRD.md` — product requirements document
- `docs/features.md` — master feature checklist with completion status (checkbox format)
- `claude-progress.txt` — current session progress tracker
- `local.env` — API keys and tokens (never commit)

## Plans Index

When starting a new feature, read the corresponding plan first. Update status to `Done` when fully implemented.

| Plan                                    | Status  | Description         |
| --------------------------------------- | ------- | ------------------- |
| `docs/plans/YYYY-MM-DD-feature-name.md` | Pending | Feature description |

---

## Working Rules

### Plan-Driven Development (Core Workflow)

1. **Plan first, code second**: Before implementing any feature, there must be a plan file in `docs/plans/`. If one doesn't exist, create it first using plan mode.
2. **Plan documentation**: Every plan is a dated `.md` file in `docs/plans/` recording: context, what changes, what files are affected, and verification steps. After writing a plan, add it to the Plans Index table above.
3. **Execute step-by-step**: When working on a plan, use TodoWrite to create a todo list from the plan's steps. Complete ONE step at a time. Mark each todo as done immediately after finishing it, then automatically continue to the next.
4. **Never skip ahead**: Do not jump to later steps. Do not batch multiple steps. Finish the current step (including tests if specified), mark it done, then move to the next.
5. **Auto-continue**: After completing a todo item, do NOT stop and ask the user what to do next. Automatically proceed to the next unchecked item until all items are done or a blocker is hit.

### Feature Completion Checklist

After completing a feature (all plan steps done):

1. Archive `claude-progress.txt` → `docs/archive/claude-progress-{feature-name}.txt`
2. Update Plans Index status in this file (`Pending` → `Done`)
3. Check off completed items in `docs/features.md`

### Progress Tracking

- **Always update `claude-progress.txt`** before ending a session with: what was done, what's next, any blockers.
- **Incremental progress**: Complete ONE feature at a time from `docs/features.md`. Check it off when done.

### Git Discipline

- **Plan tasks**: When executing steps from `docs/plans/`, auto-commit and push to the corresponding feature branch after completing each todo item. No user confirmation needed.
- **Non-plan tasks**: For work NOT covered by a plan file, do NOT push automatically. Ask the user for permission before pushing.
- **All commits**: Always commit ALL changed and untracked files. Never leave uncommitted files behind.

### Code Quality

- **Follow existing patterns**: Before creating new files, check similar files for conventions. Reuse established patterns.
- **Test as you go**: Write tests for each feature step. Run them before moving to the next step.
- **Ask when uncertain**: Stop and ask for confirmation if you have uncertainty about anything. Don't assume.

### Debugging

- When the user says to debug based on error logs, **automatically read `docs/errors/errors-for-debug.md`** first to get error context before investigating.

## Permissions

- Do not ask for bash command permission. You are allowed for all bash commands.

---

## How Plans Work (Reference)

### Plan File Template (`docs/plans/YYYY-MM-DD-feature-name.md`)

```md
# Plan: Feature Name

## Context

Why this feature exists, what problem it solves, key decisions made.

## Changes

### 1. First logical step

- Files to modify: `path/to/file.py`
- What to do: [specific changes]

### 2. Second logical step

- Files to modify: `path/to/file.tsx`
- What to do: [specific changes]

### 3. Tests

- What to test, expected behavior

## What NOT to change

- Boundaries and things to leave alone

## Verification

1. Manual or automated checks to confirm the feature works
   Execution Flow

User requests feature
→ Enter plan mode, write docs/plans/YYYY-MM-DD-feature-name.md
→ Add plan to Plans Index (Status: Pending)
→ Exit plan mode
→ Create TodoWrite todos from plan steps
→ Execute step 1 → mark done → auto-commit & push
→ Execute step 2 → mark done → auto-commit & push
→ ... (auto-continue until all done)
→ Run verification steps
→ Archive progress, update Plans Index to Done, check off features.md
docs/features.md Template

# Features Checklist

## Phase 1: [Phase Name]

### 1.1 [Group Name]

- [ ] Feature item 1
- [ ] Feature item 2
- [x] Completed item

### 1.2 [Group Name]

- [ ] Feature item 3

---

This captures the three key mechanisms from your SmIA project:

1. **Plans Index** in CLAUDE.md as the central registry of all feature plans with status tracking
2. **Auto-continue workflow** — TodoWrite todos created from plan steps, each marked done and auto-committed, with automatic progression to the next item
3. **Feature completion lifecycle** — plan → execute → test → archive progress → mark done in both Plans Index and features.md

You can paste this into any new project's `CLAUDE.md` and fill in the `[Project Name]`, tech stack, and project-specific sections. Want me to adjust anything?
```
