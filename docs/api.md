# API Reference

## Overview

The Digital Entrepreneurs platform exposes two API surfaces:

1. **WebSocket Relay API** — a Node.js/Express server (`server/`) that brokers real-time bidirectional communication between the browser client and the Google Gemini Live API. All audio streaming and transcript delivery happens here.
2. **REST API** — Next.js App Router route handlers (`app/api/`) that manage interview records and insight data in Supabase. These are stateless, authenticated endpoints consumed by the frontend.

---

## Base URLs

| Environment | WebSocket Relay | HTTP REST API |
|---|---|---|
| Production | `wss://digital-entrepreneurs-relay.fly.dev/ws` | `https://digital-entrepreneurs.vercel.app/api` |
| Local dev | `ws://localhost:8081/ws` | `http://localhost:3000/api` |

The relay server also exposes a plain HTTP endpoint on the same host/port (not `/ws`) for the health check.

---

## WebSocket Relay API

### Connection

Connect to the WebSocket endpoint:

```
ws://localhost:8081/ws           (local dev)
wss://digital-entrepreneurs-relay.fly.dev/ws   (production)
```

No authentication headers are required at the WebSocket connection level. Session ownership is established by passing `userId` and `interviewId` in the `start_session` message (see below). The relay server validates these against Supabase using the service role key server-side.

All messages are JSON-encoded text frames in both directions.

---

### Client → Server Messages

These are messages the browser sends to the relay server. All messages conform to the `ClientMessage` TypeScript interface:

```typescript
interface ClientMessage {
  type: 'audio' | 'rms' | 'start_session' | 'end_session' | 'client_turn_complete';
  data?: string;       // base64-encoded PCM16 audio (used with type: 'audio')
  rms?: number;        // RMS volume level (used with type: 'rms')
  config?: SessionConfig; // session configuration (used with type: 'start_session')
}

interface SessionConfig {
  interviewId: string;  // UUID of the interview row in Supabase
  topic: string;        // The business idea / topic being validated
  targetUser: string;   // Description of the target user persona
  userId: string;       // Supabase auth user UUID
  sampleRate: number;   // Audio sample rate in Hz (typically 16000)
}
```

---

#### `start_session`

Initiates a new interview session. The server connects to the Gemini Live API, loads the Mom Test system prompt, and instructs the AI to begin the interview immediately.

**Required fields:** `type`, `config`

```json
{
  "type": "start_session",
  "config": {
    "interviewId": "550e8400-e29b-41d4-a716-446655440000",
    "topic": "B2B invoice management software",
    "targetUser": "small business owners with 5-20 employees",
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "sampleRate": 16000
  }
}
```

**Behavior:**
- If a session already exists for this connection, it is ended first (prevents duplicates).
- The server builds the Mom Test system prompt from `topic` and `targetUser` via `prompt-bridge.ts`.
- Gemini connection has a 20-second timeout (`GEMINI_CONNECT_TIMEOUT_MS = 20000`). On timeout, an `error` message is sent and the session is not created.
- On success, a `session_started` server message is returned.
- Duration and transcript checkpoint timers start immediately after Gemini connects.

---

#### `audio`

Streams a chunk of PCM16 audio from the user's microphone to Gemini.

**Required fields:** `type`, `data`

```json
{
  "type": "audio",
  "data": "UklGRiQAAABXQVZFZm10IBAAAA..."
}
```

- `data` must be a base64-encoded PCM16 audio buffer.
- The MIME type sent to Gemini is `audio/pcm;rate=<sampleRate>` (using the sample rate from `start_session`).
- Should be sent continuously while the user is speaking (e.g., every 100ms).

---

#### `rms`

Reports the current RMS (root mean square) audio level from the client's microphone. Used server-side for silence detection.

**Required fields:** `type`, `rms`

```json
{
  "type": "rms",
  "rms": 0.032
}
```

- `rms` is a float in the range `[0, 1]`.
- Silence threshold: `RMS_SILENCE_THRESHOLD = 0.05`. Values below this are considered silence.
- Silence detection only activates after the AI has produced its first transcript output (`aiReady = true`) and only during the user's turn (`isUserTurn = true`).
- A 3-second audio drain buffer (`AUDIO_DRAIN_BUFFER_MS = 3000`) prevents false silence detection immediately after the AI finishes speaking.
- After 5 seconds of silence, a `silence_detected` warning is sent. After 35 seconds (`SILENCE_TIMEOUT_SECONDS`), the session is auto-ended.

---

#### `client_turn_complete`

Signals that the user has finished speaking their turn. This forces Gemini to stop waiting for more audio and generate a response immediately (bypasses VAD wait time).

**Required fields:** `type`

```json
{
  "type": "client_turn_complete"
}
```

- Sends a `turnComplete` signal to the Gemini session via `sendClientContent`.
- Also triggers a debounced user transcript flush (~3 seconds) so the user's spoken text appears in the transcript feed independently of Gemini's response latency.

---

#### `end_session`

Explicitly ends the interview session.

**Required fields:** `type`

```json
{
  "type": "end_session"
}
```

- Clears all timers, closes the Gemini connection, flushes remaining transcript buffers.
- Saves the final transcript to Supabase and marks the interview as `completed`.
- Auto-triggers the AI analysis pipeline (fire-and-forget).
- Returns a `session_ended` server message with `elapsedSeconds`.

---

### Server → Client Messages

Messages the relay server sends to the browser. All messages conform to the `ServerMessage` TypeScript interface:

```typescript
interface ServerMessage {
  type:
    | 'audio'
    | 'transcript'
    | 'user_transcript'
    | 'turn_complete'
    | 'interrupted'
    | 'session_started'
    | 'session_ended'
    | 'warning'
    | 'silence_detected'
    | 'error';
  data?: string;           // base64-encoded audio (used with type: 'audio')
  text?: string;           // transcript text (used with 'transcript' / 'user_transcript')
  message?: string;        // human-readable message (warnings, errors, status)
  elapsedSeconds?: number; // session duration (used with 'session_ended', 'warning')
  silenceSeconds?: number; // silence duration (used with 'silence_detected')
}
```

---

#### `session_started`

Sent once the Gemini connection is established and the session is ready.

```json
{
  "type": "session_started",
  "message": "Session 550e8400-e29b-41d4-a716-446655440000 started"
}
```

---

#### `audio`

Streams AI-generated speech audio back to the client. The client should decode and play this immediately.

```json
{
  "type": "audio",
  "data": "UklGRiQAAABXQVZFZm10IBAAAA..."
}
```

- `data` is base64-encoded PCM16 audio from Gemini's `serverContent.modelTurn.parts[].inlineData.data`.
- Multiple audio chunks are typically received per AI turn. Play them sequentially.

---

#### `transcript`

Delivers the AI interviewer's spoken text as a complete sentence (flushed at `turn_complete` or `interrupted`).

```json
{
  "type": "transcript",
  "text": "Tell me about the last time you had to manually chase down an unpaid invoice."
}
```

- Text is accumulated from Gemini's `outputTranscription` deltas and flushed as a single string when the AI turn ends.
- Corresponds to `speaker: 'ai-transcription'` in the transcript log.

---

#### `user_transcript`

Delivers the user's spoken text as a complete sentence. Sent approximately 3 seconds after `client_turn_complete` (debounced to capture all Gemini `inputTranscription` deltas).

```json
{
  "type": "user_transcript",
  "text": "Yeah, last month I had three clients that were over 60 days late."
}
```

- Text is accumulated from Gemini's `inputTranscription` deltas and flushed via a 3-second debounce timer.
- Corresponds to `speaker: 'user'` in the transcript log.

---

#### `turn_complete`

Signals that the AI has finished its turn. The client should now allow the user to speak.

```json
{
  "type": "turn_complete"
}
```

---

#### `interrupted`

Signals that the AI's turn was interrupted (e.g., user started speaking while AI was talking). Transcript buffers are flushed with whatever text was accumulated so far.

```json
{
  "type": "interrupted"
}
```

---

#### `warning`

Sent when the interview approaches or reaches the time limit.

At 12 minutes (`INTERVIEW_WARNING_SECONDS = 720`):
```json
{
  "type": "warning",
  "message": "Interview approaching time limit (12 minutes)",
  "elapsedSeconds": 722
}
```

At 15 minutes (`MAX_INTERVIEW_DURATION_SECONDS = 900`), session is auto-ended immediately after this message:
```json
{
  "type": "warning",
  "message": "Interview auto-ending — maximum duration reached",
  "elapsedSeconds": 900
}
```

---

#### `silence_detected`

Sent periodically while the user is silent during their turn. Sent starting at 5 seconds of silence; session auto-ends at 35 seconds.

Warning (5–34 seconds of silence):
```json
{
  "type": "silence_detected",
  "silenceSeconds": 8
}
```

Auto-end trigger (35 seconds of silence):
```json
{
  "type": "silence_detected",
  "message": "Auto-ending due to extended silence",
  "silenceSeconds": 35
}
```

After the auto-end message, a `session_ended` message follows immediately.

---

#### `session_ended`

Sent when the session has been fully torn down (regardless of how it ended — explicit `end_session`, silence timeout, duration limit, or client disconnect).

```json
{
  "type": "session_ended",
  "message": "Interview session ended",
  "elapsedSeconds": 487
}
```

---

#### `error`

Sent when a recoverable or non-recoverable error occurs. The session may or may not still be active depending on the error.

```json
{
  "type": "error",
  "message": "Gemini connection timed out — please try again"
}
```

Common error messages:
- `"Missing session config"` — `start_session` sent without `config`
- `"Missing audio data"` — `audio` message sent without `data`
- `"Missing RMS value"` — `rms` message sent without `rms`
- `"Gemini connection timed out — please try again"` — Gemini did not respond within 20s
- `"Unknown message type: <type>"` — unrecognized `type` in client message
- `"Gemini error: <message>"` — error forwarded from Gemini Live API

---

### Session Lifecycle

The complete message flow for a typical interview session:

```
Client                          Relay Server                    Gemini Live API
  |                                  |                                |
  |-- start_session (config) ------->|                                |
  |                                  |-- ai.live.connect() ---------->|
  |                                  |<-- onopen ----------------------|
  |                                  |-- sendClientContent ("Begin") ->|
  |<-- session_started --------------|                                |
  |                                  |                                |
  |-- audio (chunk 1) -------------->|-- sendRealtimeInput ---------->|
  |-- audio (chunk 2) -------------->|-- sendRealtimeInput ---------->|
  |-- rms (0.12) ------------------->|  (below silence threshold?)    |
  |-- client_turn_complete --------->|-- sendClientContent (turn) --->|
  |                                  |                                |
  |                                  |<-- serverContent.modelTurn ----|
  |<-- audio (AI speech chunk 1) ----|                                |
  |<-- audio (AI speech chunk 2) ----|                                |
  |<-- user_transcript ("user...") --|  (debounced ~3s after turn)    |
  |                                  |<-- outputTranscription ---------|
  |                                  |<-- turnComplete ----------------|
  |<-- transcript ("Tell me...") ----|                                |
  |<-- turn_complete ----------------|                                |
  |                                  |                                |
  | ... (more turns) ...             |                                |
  |                                  |                                |
  |-- end_session ------------------>|                                |
  |                                  |-- session.close() ------------>|
  |                                  |-- Supabase: completeInterview()|
  |                                  |-- analyzeTranscript() [async]  |
  |<-- session_ended (elapsedSecs) --|                                |
```

**Transcript checkpoints:** Every 30 seconds (`TRANSCRIPT_CHECKPOINT_INTERVAL_MS`), the relay server saves the current transcript to Supabase as a rolling checkpoint. This ensures data is preserved even if the connection drops unexpectedly.

**Auto-analysis:** After `session_ended`, the relay server asynchronously calls `analyzeTranscript(interviewId)`. This runs the Gemini analysis pipeline and inserts a row into the `insights` table. The client does not need to wait for this — it can poll `GET /api/interview/:id/insight` to check readiness.

---

## REST API

All REST endpoints are Next.js App Router route handlers. Base path: `/api`.

Authentication is required for all endpoints except the relay's `/health`. The client must include a valid Supabase session cookie (set automatically by the Supabase SSR client during login). All endpoints verify that the authenticated user owns the requested resource before returning data.

---

### GET /health

Returns server uptime. No authentication required. This is on the **relay server**, not the Next.js app.

**URL:** `http://localhost:8081/health` (local) or `https://digital-entrepreneurs-relay.fly.dev/health`

**Response 200:**
```json
{
  "status": "ok",
  "uptime": 3742.851
}
```

- `uptime` is `process.uptime()` in seconds.

---

### POST /api/interview/start

Creates a new interview record in Supabase and returns the generated UUID. The client uses this UUID as `interviewId` in the subsequent `start_session` WebSocket message.

**Auth required:** Yes (Supabase session cookie)

**Request body:**
```json
{
  "participantName": "Jane Smith",
  "topic": "B2B invoice management software",
  "targetUser": "small business owners with 5-20 employees"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `participantName` | string | Yes | Name of the person being interviewed |
| `topic` | string | Yes | The business idea or product topic |
| `targetUser` | string | Yes | Description of the target customer persona |

**Response 200:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error responses:**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Participant name is required" }` | `participantName` missing or blank |
| 400 | `{ "error": "Business idea/topic is required" }` | `topic` missing or blank |
| 400 | `{ "error": "Target user description is required" }` | `targetUser` missing or blank |
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 500 | `{ "error": "Failed to create interview" }` | Supabase insert error |

**Notes:**
- The interview row is created with `status: 'active'`.
- The `user_id` is taken from the authenticated session (never from the request body).

---

### GET /api/interviews

Returns all interviews belonging to the authenticated user, ordered newest first. Used to populate the dashboard.

**Auth required:** Yes

**Response 200:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "participant_name": "Jane Smith",
    "topic": "B2B invoice management software",
    "target_user": "small business owners with 5-20 employees",
    "status": "completed",
    "duration_seconds": 487,
    "created_at": "2026-03-10T14:22:00.000Z",
    "updated_at": "2026-03-10T14:30:27.000Z"
  }
]
```

Returns an empty array `[]` if the user has no interviews.

**Error responses:**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 500 | `{ "error": "Failed to fetch interviews" }` | Supabase query error |

---

### GET /api/interview/[id]

Returns the full interview record including the transcript.

**Auth required:** Yes

**URL params:** `id` — UUID of the interview

**Response 200:** Full interview row from Supabase (`select('*')`), including the `transcript` JSON array.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "participant_name": "Jane Smith",
  "topic": "B2B invoice management software",
  "target_user": "small business owners with 5-20 employees",
  "status": "completed",
  "duration_seconds": 487,
  "transcript": [
    { "speaker": "ai-transcription", "text": "Hello, I'm here to learn about your experience...", "timestamp": 1741614120000 },
    { "speaker": "user", "text": "Sure, last month I had three clients that were over 60 days late.", "timestamp": 1741614135000 }
  ],
  "created_at": "2026-03-10T14:22:00.000Z",
  "updated_at": "2026-03-10T14:30:27.000Z"
}
```

**Error responses:**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 404 | `{ "error": "Interview not found" }` | ID not found or not owned by user |
| 500 | `{ "error": "Internal server error" }` | Unexpected error |

---

### PATCH /api/interview/[id]

Updates an interview record. Used by the client to save transcript data, update status, or record duration. Transcript text is sanitized (HTML tags stripped) server-side.

**Auth required:** Yes

**URL params:** `id` — UUID of the interview

**Request body** (all fields optional):
```json
{
  "transcript": [
    { "speaker": "ai-transcription", "text": "...", "timestamp": 1741614120000 },
    { "speaker": "user", "text": "...", "timestamp": 1741614135000 }
  ],
  "status": "completed",
  "duration_seconds": 487
}
```

| Field | Type | Description |
|---|---|---|
| `transcript` | `TranscriptEntry[]` | Array of transcript entries. Text is sanitized (HTML stripped). |
| `status` | string | Interview status (e.g., `'active'`, `'completed'`) |
| `duration_seconds` | number | Interview duration in seconds |

**Transcript entry shape:**
```typescript
interface TranscriptEntry {
  speaker: 'ai' | 'user' | 'ai-transcription';
  text: string;
  timestamp: number; // Unix timestamp in milliseconds
}
```

**Response 200:**
```json
{ "success": true }
```

**Error responses:**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 404 | `{ "error": "Interview not found" }` | ID not found or not owned by user |
| 500 | `{ "error": "Failed to update interview" }` | Supabase update error |

---

### DELETE /api/interview/[id]

Deletes an interview and all related records (insights, AI logs) from Supabase. Cascades to the `insights` and `ai_logs` tables first due to foreign key constraints.

**Auth required:** Yes

**URL params:** `id` — UUID of the interview

**Response 200:**
```json
{ "success": true }
```

**Error responses:**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 404 | `{ "error": "Interview not found" }` | ID not found or not owned by user |
| 500 | `{ "error": "Failed to delete interview" }` | Supabase delete error |

---

### GET /api/interview/[id]/insight

Returns the AI-generated insight report for a completed interview, along with interview metadata. The insight is created asynchronously after the WebSocket session ends — this endpoint should be polled until it returns 200.

**Auth required:** Yes

**URL params:** `id` — UUID of the interview

**Response 200:**
```json
{
  "interview": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "participant_name": "Jane Smith",
    "topic": "B2B invoice management software",
    "target_user": "small business owners with 5-20 employees",
    "status": "completed",
    "duration_seconds": 487,
    "created_at": "2026-03-10T14:22:00.000Z"
  },
  "insight": {
    "id": "...",
    "interview_id": "550e8400-e29b-41d4-a716-446655440000",
    "pain_points": [...],
    "validated": true,
    "summary": "...",
    "created_at": "2026-03-10T14:31:00.000Z"
  }
}
```

The exact shape of the `insight` object depends on the Supabase `insights` table schema and the analysis pipeline output.

**Error responses:**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 404 | `{ "error": "Interview not found" }` | Interview not found or not owned by user |
| 404 | `{ "error": "Insight not found" }` | Analysis not yet complete — retry |
| 500 | `{ "error": "Internal server error" }` | Unexpected error |

---

## Authentication

All REST API endpoints use **Supabase Auth** (cookie-based sessions). Authentication is handled by the `getAuthUser()` helper in `lib/auth.ts`, which reads the session from the request cookies using the Supabase SSR client.

Supported auth methods:
- Google OAuth
- Email + password

The authenticated user's `id` (UUID) is automatically used to scope all database queries — clients cannot access or modify other users' data.

The relay server does not independently validate JWTs. The `userId` in the `start_session` message is used for Supabase operations server-side using the **service role key** (never exposed to the client). The relay server trusts the `userId` from the client message; access control is enforced at the REST layer before the WebSocket session is initiated.

---

## Error Handling

### WebSocket errors

All WebSocket errors are sent as JSON frames with `type: 'error'`:

```json
{
  "type": "error",
  "message": "Human-readable error description"
}
```

The connection is not automatically closed after an error message (except when the session itself fails to initialize). The client should handle errors gracefully and display them via the toast notification system.

### REST API errors

All REST error responses follow the same shape:

```json
{
  "error": "Human-readable error description"
}
```

Standard HTTP status codes are used:
- `400` — Bad request (validation failure)
- `401` — Unauthorized (no valid session)
- `404` — Resource not found (or not owned by current user)
- `500` — Internal server error

---

## Rate Limits

Rate limiting is **not implemented for MVP** (tracked in GitHub issue #17).

The relay server defaults to port `8081` and does not enforce per-user request limits. The `/api/interview/start` endpoint is planned to be rate-limited to 10 requests/minute per user post-MVP.

---

## Relay Server Constants

Key timing and threshold values used by the relay server:

| Constant | Value | Description |
|---|---|---|
| `MAX_INTERVIEW_DURATION_SECONDS` | 900 (15 min) | Auto-ends session at this duration |
| `INTERVIEW_WARNING_SECONDS` | 720 (12 min) | Sends `warning` message at this duration |
| `SILENCE_TIMEOUT_SECONDS` | 35 | Auto-ends session after this many seconds of silence |
| `RMS_SILENCE_THRESHOLD` | 0.05 | RMS values below this are treated as silence |
| `TRANSCRIPT_CHECKPOINT_INTERVAL_MS` | 30,000 (30s) | How often the transcript is saved to Supabase mid-session |
| `GEMINI_CONNECT_TIMEOUT_MS` | 20,000 (20s) | Timeout for initial Gemini Live API handshake |
| `AUDIO_DRAIN_BUFFER_MS` | 3,000 (3s) | Grace period after AI audio ends before silence detection resumes |

---

## Gemini Model

The relay uses the following Gemini models:

| Purpose | Model |
|---|---|
| Voice interview (Live API) | `gemini-2.5-flash-native-audio-latest` |
| Transcript analysis | `gemini-3.1-pro-preview` (via analysis pipeline) |

The Live API session is configured with:
- Response modality: **AUDIO**
- Voice: **Aoede**
- Input audio transcription: enabled
- Output audio transcription: enabled
- System instruction: Mom Test interviewer prompt (built from `topic` and `targetUser`)
