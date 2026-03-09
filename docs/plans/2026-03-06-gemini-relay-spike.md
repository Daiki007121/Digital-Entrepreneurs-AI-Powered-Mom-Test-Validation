# Plan 0: Gemini Relay Spike (Risk Validation)

**Time**: 2-3 hours | **Branch**: `spike/gemini-relay` | **Throwaway**: Yes (code discarded after validation)

## Why

The alpha calls Gemini directly from the browser. We're adding a relay server in between — this has never been tested. If it doesn't work, the entire architecture needs rethinking. Validate before investing in infrastructure.

## What to Build

### 1. Minimal Node.js WebSocket server (~50 lines)
- Accepts browser WebSocket connection
- Connects to Gemini Live API via `@google/genai` SDK
- Forwards PCM16 audio from browser -> Gemini
- Forwards Gemini audio response -> browser
- Returns AI transcript text

### 2. Raw HTML test page (~30 lines)
- "Start" button that captures mic via `getUserMedia`
- Streams audio to local relay server
- Plays back AI audio response
- Displays AI transcript text

## Success Criteria
- [ ] Can speak to AI through relay and hear response
- [ ] AI transcript text appears
- [ ] Latency is acceptable (< 1s round-trip for audio)
- [ ] No WebSocket connection issues between browser <-> relay <-> Gemini

## If Spike Fails
- Option A: Call Gemini directly from browser (like alpha) + use Supabase Edge Functions for server-side operations
- Option B: Different Gemini API endpoint or configuration
- Option C: Fall back to OpenAI Realtime API (has documented relay patterns)

## After Spike
- Document findings (what worked, any gotchas)
- Delete spike branch (code was throwaway)
- Proceed to Plan 1 with confidence

## Prerequisites
- Google AI API key with access to `gemini-2.5-flash-native-audio-preview`
