# Building an AI-Powered Mom Test Interviewer: Real-Time Voice AI for Startup Validation

## The Problem: Why Most Founder Interviews Fail

Every startup founder knows they should talk to users before building. Rob Fitzpatrick's "The Mom Test" is the gold standard for conducting unbiased customer interviews — but following its rules in practice is surprisingly hard. The core principle is simple: ask about the user's life, not your idea. Ask about specific past behavior, not hypothetical futures. Listen more than you talk.

The problem is that even experienced founders slip into leading questions. "Would you use an app that does X?" feels like validation, but it is worthless data. Your mom would say yes. Your friends would say yes. Everyone says yes to hypothetical questions because it costs them nothing.

We set out to build a tool that eliminates this bias entirely: an AI interviewer that strictly enforces Mom Test methodology, conducts real-time voice conversations with interviewees, and automatically generates insight reports with validated pain points.

## Architecture: Why a Relay Server Matters

The application has three layers: a Next.js 14 frontend, a Node.js WebSocket relay server, and Supabase for authentication and data persistence.

The most critical architecture decision was introducing the relay server. Jason had already built a working prototype — a browser-only SPA that called the Gemini Live API directly from the frontend. It worked great for a demo, but production requirements made it untenable. API keys would be exposed in browser source code. There was no way to persist transcripts or enforce authentication. Multi-user support was impossible.

The relay server sits between the browser and Google's Gemini Live API. The browser captures microphone audio, encodes it as PCM16, and streams it over a WebSocket to our server. The server forwards audio to Gemini and relays responses back — both the AI's voice audio and its transcribed text. This keeps the API key server-side, enables transcript persistence through incremental checkpoints to Supabase, and supports multiple concurrent interview sessions.

We validated this architecture with a throwaway spike before writing any production code. A 50-line Node.js server and a 30-line HTML test page confirmed that the relay approach worked with acceptable latency. This two-hour investment saved us from discovering a fundamental architecture problem deep into development.

## The Audio Pipeline: Harder Than Expected

Real-time voice AI sounds simple in theory: capture audio, send it, play the response. In practice, the audio pipeline was the most technically challenging and bug-prone part of the entire project.

Our first major issue was a sample rate mismatch. The original code hardcoded a 24kHz sample rate based on the prototype, but Mac browsers actually record at 48kHz. Audio sent to Gemini at the wrong rate produced garbled or silent responses. The fix was straightforward — dynamically detect the browser's actual AudioContext sample rate — but the bug was invisible during development on one machine and only appeared during cross-device testing.

The second challenge was turn detection. In a natural conversation, you need to know when someone has finished speaking so the AI can respond. We implemented a two-layer approach: the browser computes RMS (root mean square) energy values from each audio buffer and sends them to the server, which tracks silence duration. If both sides are silent for 35 seconds, the session ends automatically. For shorter pauses, the client sends an explicit "turn complete" signal after 2 seconds of silence, prompting Gemini to respond faster.

Getting the silence threshold right required iteration. Too sensitive (RMS threshold of 0.01) and ambient noise would prevent the turn-complete signal from ever firing. Too aggressive (threshold above 0.1) and quiet speakers would trigger false timeouts. We settled on 0.05 after testing across different environments.

We also discovered that Gemini's voice activity detection requires continuous audio input — including silence. Our initial implementation only sent audio frames above the silence threshold, which confused Gemini's internal turn detection. Switching to continuous streaming and using our own explicit turn-complete signals resolved the issue.

## Mom Test Enforcement: Prompt Engineering as Product Design

The AI interviewer's behavior is defined by a system prompt injected at session creation time. This prompt is arguably the most important piece of code in the entire application, even though it contains zero traditional programming logic.

The prompt establishes several rules. The AI must never ask leading questions such as "Would you use this?" or "Do you think this is a good idea?" Instead, it must always redirect to past behavior: "Tell me about the last time you experienced this problem." It must probe for specifics — not "Do you exercise?" but "How many times did you go to the gym last week?" It must listen more than it speaks and avoid pitching the founder's idea.

The prompt also defines interview structure: an opening phase to build rapport, an exploration phase to understand the problem space, a deep-dive phase to validate specific pain points, and a closing phase to identify next steps. The AI tracks which topics it has covered and which need more exploration.

We also implemented a leading question detector in our server-side logic. Every AI transcript segment is checked against known leading question patterns. If the AI accidentally produces a leading question, it gets logged for review. In practice, with a well-tuned prompt, the Gemini model rarely violates Mom Test principles — but the safety net exists for edge cases.

## Analysis Pipeline: From Transcript to Actionable Insights

When an interview ends, the system automatically triggers an analysis pipeline. The full transcript, along with the business idea and target user description, is sent to Gemini 3.1 Pro with a structured JSON output schema. The model returns a validation score (0–100), a list of pain points with severity ratings and evidence quotes from the transcript, recurring themes, recommended next steps, and a final verdict on whether the business idea shows promise.

Using Gemini's native JSON Schema structured output guarantees parseable responses. The schema defines exactly what fields the model must return and their types — validation score as an integer between 0 and 100, pain points as an array of objects with title, severity, and evidence fields, themes as string arrays, and next steps as ordered lists. This eliminates the fragility of regex-based response parsing and means we never need to handle malformed AI output. If the model cannot produce valid JSON matching the schema, the SDK throws an error that we catch and retry up to three times.

The insight report surfaces on a dedicated page with an animated validation score visualization, expandable pain point cards that show the actual transcript evidence, and a prioritized next steps list. Founders can see at a glance whether their interviews validated their assumptions or revealed unexpected problems.

## CI/CD and Testing: Automating Quality

Automated quality gates were non-negotiable for a two-person team moving at high velocity. From the first commit, every push triggered a GitHub Actions pipeline: ESLint linting, TypeScript type checking, Jest tests, and both frontend and server builds. This caught regressions immediately and enforced code quality standards defined in the CLAUDE.md rules file — a project-specific configuration that specified naming conventions, architecture rules, and coding standards for AI-assisted development.

The test suite follows a TDD approach for core logic — validators, Mom Test utilities, prompt loaders, the Gemini wrapper, and the session manager all had tests written before implementation. UI components received smoke tests after implementation, verifying that they render correctly with various props and respond to user interactions.

We also configured Cursor Bugbot for automated PR reviews. On PR #29 (audio latency fixes), Bugbot caught two issues that human reviewers likely would have missed under time pressure: a debug console.log that would have flooded production logs with base64 audio data on every WebSocket message, and an RMS threshold constant that was updated on the server but not the client.

## AI-Assisted Development: Lessons Learned

This project used multiple AI tools, and the most valuable insight was that each tool has a distinct sweet spot. Claude Web excelled at architecture brainstorming and debugging — when we needed to reason about why audio was cutting out, an iterative conversation exploring the problem space was far more effective than code generation. IDE-centric tools like Claude Code and Antigravity were optimal for implementation — generating boilerplate, writing tests from patterns, and scaffolding components. Google AI Studio was essential for prompt iteration, letting us test Mom Test enforcement without rebuilding the server.

The key lesson: treat AI tools as specialized instruments, not interchangeable hammers. Use the right tool for the right task, and switch freely between them.

## What's Next

The current MVP validates the core concept: AI can conduct unbiased Mom Test interviews and produce actionable insight reports. The immediate roadmap includes production deployment (Vercel for the frontend, Fly.io for the relay server), upgrading the deprecated ScriptProcessorNode to AudioWorkletNode for better audio performance, adding PDF export for insight reports, and building multiple interview templates for different startup validation scenarios.

The longer-term vision is ambitious: using validated pain points from interviews to automatically generate and deploy SaaS solutions. But that is a story for another blog post — and probably another set of Mom Test interviews first.
