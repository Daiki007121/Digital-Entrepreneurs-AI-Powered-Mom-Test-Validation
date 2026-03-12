# AI Mastery: Multi-Modality Usage Log

## Overview

This project leveraged multiple AI modalities throughout the development lifecycle, each chosen for specific strengths. The two primary categories were **Claude Web (conversational AI)** and **IDE-centric AI tools (code generation)**. Additional AI platforms were used for prototyping and API validation.

---

## Modality 1: Claude Web (claude.ai) — Architecture & Strategy

### When Used
- Project planning and architecture decisions
- Rubric analysis and task prioritization
- Debugging complex audio pipeline issues
- Writing documentation and communication drafts

### Specific Examples

**Architecture Brainstorming (Pre-Sprint 1)**
Used Claude Web to discuss the Mom Test interview concept and estimate development time for different approaches (text-only vs. voice, Web Speech API vs. OpenAI Realtime vs. Gemini Live). Claude helped evaluate trade-offs between building a browser-only SPA (like the alpha) versus a relay server architecture that keeps API keys server-side. The relay server approach was chosen based on this analysis.

**Audio Pipeline Debugging (Sprint 2)**
When the Gemini Live API was exhausting tokens mid-interview, Claude Web diagnosed the issue as a combination of redundant `inputAudioTranscription` configuration, an overly long system prompt, and too-small ScriptProcessor buffer size. Claude provided specific fixes — remove the redundant field, shorten the prompt, increase buffer from 4096 to 8192 — formatted as copy-paste instructions for the IDE.

**PR Review Analysis (Sprint 2)**
After Cursor Bugbot flagged two issues on PR #29, Claude Web was used to understand the implications (RMS threshold mismatch between client and server, verbose console.log in production) and generate the exact code fixes.

**Task Planning and Communication**
Claude Web analyzed the full rubric (200 points across 6 categories) against the current codebase state, identified gaps, estimated remaining work, and drafted team communication for task splitting.

### Why This Modality
Claude Web excels at open-ended reasoning, multi-step planning, and understanding context across long conversations. Architecture decisions and debugging require back-and-forth exploration that IDE-centric tools are not optimized for.

---

## Modality 2: IDE-Centric AI — Code Generation & Implementation

### Tools Used
- **Claude Code** (Jason's primary tool) — agentic coding in terminal
- **Antigravity** (Google's agent-first IDE) — Daiki's primary development environment
- **Cursor** — PR review via Bugbot, code suggestions

### Specific Examples

**Foundation Scaffolding (Claude Code — Sprint 1)**
Jason used Claude Code to generate the entire project foundation in a single session: Next.js 14 scaffolding, Supabase schema with RLS policies, authentication middleware, UI component library (Button, Card, Modal, Badge, Input, Spinner, Toast, ErrorBoundary), shared utilities, and the CI/CD pipeline. The CLAUDE.md rules file ensured consistent code quality across all generated code.

**Gemini Relay Server (Claude Code — Sprint 1)**
The WebSocket relay server — the most architecturally complex component — was built with Claude Code following TDD methodology. Tests for `session-manager.ts` were written first, then the implementation. The relay handles bidirectional audio streaming, transcript checkpointing, silence detection, and auto-analysis triggering.

**Audio Latency Fixes (Antigravity — Sprint 2)**
Daiki used Antigravity to implement the audio pipeline improvements in PR #29: dynamic sample rate detection, buffer size reduction, continuous audio streaming, turn-complete signaling, and the hasSpokenRef flag for silence timer management. Antigravity's inline code generation was used for the ScriptProcessor callback logic and WebSocket message handling.

**Test Generation (Claude Code — Sprint 2)**
Claude Code generated the test suite following existing test patterns. By providing one reference test file (e.g., `interview-card.test.tsx`), Claude Code produced consistent tests for all remaining components and utility modules targeting 80%+ coverage.

**Automated PR Review (Cursor Bugbot)**
Cursor Bugbot automatically reviewed PR #29 and identified two medium-severity issues: a `console.log` that bypassed the production-aware logger utility, and an RMS threshold inconsistency between client and server constants. This caught bugs that might have reached production.

### Why This Modality
IDE-centric tools are optimal for high-volume code generation, test writing, and repetitive implementation tasks. Claude Code's ability to read the full codebase context (via CLAUDE.md rules) and generate code that follows established patterns made it ideal for the implementation-heavy sprints. Antigravity's tight integration with Google AI Studio was particularly useful for Gemini API work.

---

## Modality 3: Google AI Studio — Prototyping & API Validation

### When Used
- Building the initial MVP prototype before production architecture
- Testing Gemini Live API key configuration and model access
- Validating conversation quality and voice interaction smoothness
- Rapid iteration on system prompts

### Specific Examples

**MVP Prototype**
Before building the full Next.js application, a working prototype was created directly in Google AI Studio to validate that the Gemini Live API could conduct natural Mom Test interviews. This prototype confirmed the voice quality, response latency, and conversation flow were acceptable before committing to the relay server architecture.

**API Key and Model Testing**
Google AI Studio was used to verify API key permissions, test different Gemini model versions (`gemini-2.5-flash-native-audio-preview` for voice, `gemini-3.1-pro-preview` for analysis), and confirm that the structured JSON output schema produced valid responses.

**System Prompt Iteration**
The Mom Test enforcer prompt (`prompts/momTestEnforcer.md`) was iteratively refined in Google AI Studio before being integrated into the relay server. Testing in AI Studio allowed rapid prompt changes without rebuilding the server.

### Why This Modality
Google AI Studio provides the lowest-friction environment for testing Gemini-specific features. Since the project uses Gemini as its AI provider, validating API behavior directly in Google's own platform eliminated variables (network, SDK version, relay server bugs) during prompt development and API exploration.

---

## Decision Framework: When to Use Each Modality

| Task Type | Modality | Rationale |
|-----------|----------|-----------|
| Architecture planning | Claude Web | Open-ended reasoning, multi-step analysis |
| Debugging complex issues | Claude Web | Iterative diagnosis with context retention |
| Project scaffolding | Claude Code | High-volume code generation with codebase context |
| Feature implementation | Claude Code / Antigravity | Fast code generation following established patterns |
| Test writing | Claude Code | Pattern-based generation from reference tests |
| API prototyping | Google AI Studio | Direct access to Gemini models, zero setup |
| Prompt engineering | Google AI Studio | Rapid iteration without rebuilding |
| PR review | Cursor Bugbot | Automated, catches issues humans miss under time pressure |
| Communication drafts | Claude Web | Natural language, tone-aware generation |
| Rubric analysis | Claude Web | Multi-document reasoning, prioritization |

---

## Key Takeaway

The most effective pattern was using **Google AI Studio for prototyping → Claude Web for architecture decisions → IDE tools for implementation**. Each modality has a sweet spot, and switching between them based on the task type significantly improved development velocity compared to using any single tool for everything.
