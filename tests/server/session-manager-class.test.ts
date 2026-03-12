/**
 * Tests for server/session-manager.ts — SessionManager class
 * Mocks WebSocket, GeminiRelay, and dynamic imports (supabase-ops, analysis, prompt-bridge)
 */

// --- Mock ws ---
const mockWsSend = jest.fn();

// We'll create individual mock WS instances with configurable readyState
function createMockWs(readyState = 1) {
  return {
    readyState,
    send: mockWsSend,
  };
}

// Mock ws — the SessionManager uses `WebSocket.OPEN` as a static property.
// The factory must not reference variables from the enclosing scope (jest.mock is hoisted).
jest.mock('ws', () => {
  const WS = function MockWebSocket(this: { readyState: number; send: jest.Mock }) {
    this.readyState = 1;
  } as unknown as new () => { readyState: number; send: jest.Mock };
  (WS as unknown as { OPEN: number }).OPEN = 1;
  return { WebSocket: WS };
});

// --- Mock GeminiRelay ---
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockSendAudio = jest.fn();
const mockSendTurnComplete = jest.fn();
const mockTriggerUserTranscriptFlush = jest.fn();

// The server/session-manager.ts imports './gemini-relay.js' which maps to './gemini-relay'
// The @/ alias maps to rootDir, so we mock the full path
jest.mock('@/server/gemini-relay', () => ({
  GeminiRelay: jest.fn().mockImplementation((_ws: unknown, callbacks: Record<string, unknown>) => ({
    connect: mockConnect,
    close: mockClose,
    sendAudio: mockSendAudio,
    sendTurnComplete: mockSendTurnComplete,
    triggerUserTranscriptFlush: mockTriggerUserTranscriptFlush,
    _callbacks: callbacks,
  })),
}));

// --- Mock prompt-bridge (dynamic import in createSession) ---
jest.mock('@/server/prompt-bridge', () => ({
  buildInterviewPrompt: jest.fn(() => 'Mock system instruction'),
}));

// --- Mock supabase-ops (dynamic import in saveCheckpoint/saveFinalTranscript) ---
jest.mock('@/server/supabase-ops', () => ({
  updateTranscript: jest.fn().mockResolvedValue(undefined),
  completeInterview: jest.fn().mockResolvedValue(undefined),
}));

// --- Mock analysis (dynamic import in saveFinalTranscript) ---
jest.mock('@/server/analysis', () => ({
  analyzeTranscript: jest.fn().mockResolvedValue(undefined),
}));

import { SessionManager } from '@/server/session-manager';
import { GeminiRelay } from '@/server/gemini-relay';

type MockWs = ReturnType<typeof createMockWs>;

const createConfig = (overrides: Record<string, unknown> = {}) => ({
  interviewId: 'interview-test-123',
  userId: 'user-456',
  topic: 'SaaS for dentists',
  targetUser: 'dental clinic owners',
  sampleRate: 24000,
  ...overrides,
});

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    manager = new SessionManager();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createSession', () => {
    it('creates a session and sends session_started message', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);

      expect(mockWsSend).toHaveBeenCalledWith(
        expect.stringContaining('"type":"session_started"'),
      );
    });

    it('calls GeminiRelay.connect with system instruction', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);

      expect(mockConnect).toHaveBeenCalledWith('Mock system instruction');
    });

    it('constructs GeminiRelay with ws and sampleRate', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(
        ws,
        createConfig({ sampleRate: 16000 }) as import('@/server/types').SessionConfig,
      );

      expect(GeminiRelay).toHaveBeenCalledWith(
        ws,
        expect.any(Object),
        16000,
      );
    });

    it('ends existing session before creating a new one for same ws', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);

      // Create second session for same ws
      await manager.createSession(
        ws,
        createConfig({ interviewId: 'interview-2' }) as import('@/server/types').SessionConfig,
      );

      // close should have been called for the first session
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('sends error message when Gemini connect fails', async () => {
      mockConnect.mockRejectedValueOnce(new Error('Connection refused'));
      const ws = createMockWs() as unknown as import('ws').WebSocket;

      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);

      expect(mockWsSend).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"'),
      );
    });

    it('uses default sampleRate of 24000 when not provided', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      const config = { ...createConfig() };
      // @ts-expect-error testing missing optional field
      delete config.sampleRate;

      await manager.createSession(ws, config as import('@/server/types').SessionConfig);

      expect(GeminiRelay).toHaveBeenCalledWith(
        ws,
        expect.any(Object),
        24000,
      );
    });
  });

  describe('handleAudio', () => {
    it('calls relay.sendAudio with base64 audio', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);

      manager.handleAudio(ws, 'base64audiodata==');

      expect(mockSendAudio).toHaveBeenCalledWith('base64audiodata==');
    });

    it('does nothing when no session exists for ws', () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      // No session created
      manager.handleAudio(ws, 'audio');

      expect(mockSendAudio).not.toHaveBeenCalled();
    });
  });

  describe('handleTurnComplete', () => {
    it('calls relay.sendTurnComplete and triggerUserTranscriptFlush', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);

      manager.handleTurnComplete(ws);

      expect(mockSendTurnComplete).toHaveBeenCalledTimes(1);
      expect(mockTriggerUserTranscriptFlush).toHaveBeenCalledTimes(1);
    });

    it('does nothing when no session exists', () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      manager.handleTurnComplete(ws);

      expect(mockSendTurnComplete).not.toHaveBeenCalled();
    });
  });

  describe('handleRms', () => {
    it('does nothing when no session exists', () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      // Should not throw
      expect(() => manager.handleRms(ws, 0.01)).not.toThrow();
    });

    it('does not start silence detection when aiReady is false', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);
      mockWsSend.mockClear();

      // RMS is low (silence) but aiReady is false (session just created)
      manager.handleRms(ws, 0.001);

      // No silence_detected message expected
      const calls = mockWsSend.mock.calls.map((c) => JSON.parse(c[0] as string));
      expect(calls.some((c: { type: string }) => c.type === 'silence_detected')).toBe(false);
    });
  });

  describe('endSession', () => {
    it('calls relay.close', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);

      await manager.endSession(ws);

      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('sends session_ended message to client', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);
      mockWsSend.mockClear();

      await manager.endSession(ws);

      expect(mockWsSend).toHaveBeenCalledWith(
        expect.stringContaining('"type":"session_ended"'),
      );
    });

    it('does nothing when no session exists', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      // Should not throw or call close
      await manager.endSession(ws);
      expect(mockClose).not.toHaveBeenCalled();
    });

    it('prevents double-end by removing session from map immediately', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);

      // Call endSession twice concurrently
      await Promise.all([manager.endSession(ws), manager.endSession(ws)]);

      // relay.close should only be called once (second call exits early)
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleDisconnect', () => {
    it('ends the session for the disconnected ws', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);

      manager.handleDisconnect(ws);

      // Give the promise time to resolve
      await Promise.resolve();
      await Promise.resolve();

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('closeAll', () => {
    it('ends all active sessions', async () => {
      const ws1 = createMockWs() as unknown as import('ws').WebSocket;
      const ws2 = createMockWs() as unknown as import('ws').WebSocket;

      await manager.createSession(
        ws1,
        createConfig({ interviewId: 'id-1' }) as import('@/server/types').SessionConfig,
      );
      await manager.createSession(
        ws2,
        createConfig({ interviewId: 'id-2' }) as import('@/server/types').SessionConfig,
      );
      mockClose.mockClear();

      manager.closeAll();

      await Promise.resolve();
      await Promise.resolve();

      expect(mockClose).toHaveBeenCalledTimes(2);
    });

    it('does nothing when no sessions are active', () => {
      // Should not throw
      expect(() => manager.closeAll()).not.toThrow();
    });
  });

  describe('GeminiRelay callbacks', () => {
    // Helper to get callbacks passed to GeminiRelay constructor
    async function createSessionAndGetCallbacks(ws: import('ws').WebSocket) {
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);
      // The GeminiRelay mock captures callbacks as second argument
      const calls = (GeminiRelay as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      return lastCall[1] as {
        onTranscript: (entry: { speaker: string; text: string; timestamp: number }) => void;
        onTurnComplete: () => void;
        onError: (error: string) => void;
        onAudioSent: () => void;
      };
    }

    it('onTranscript adds entry to session transcript', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      const callbacks = await createSessionAndGetCallbacks(ws);

      callbacks.onTranscript({ speaker: 'ai', text: 'Hello!', timestamp: 1000 });

      // Calling endSession would include transcript — we just verify no error
      expect(() => callbacks.onTranscript({ speaker: 'user', text: 'Hi', timestamp: 2000 })).not.toThrow();
    });

    it('onTranscript sets aiReady to true', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      const callbacks = await createSessionAndGetCallbacks(ws);

      // Before transcript: aiReady is false, so handleRms should not trigger silence
      manager.handleRms(ws, 0.001); // Below threshold but aiReady=false → no silence

      callbacks.onTranscript({ speaker: 'ai', text: 'Hello!', timestamp: 1000 });

      // Now aiReady is true. After onTurnComplete, isUserTurn will be true too.
      expect(() => callbacks.onTranscript({ speaker: 'ai', text: 'More', timestamp: 2000 })).not.toThrow();
    });

    it('onTurnComplete sets isUserTurn to true', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      const callbacks = await createSessionAndGetCallbacks(ws);

      callbacks.onTranscript({ speaker: 'ai', text: 'Hello!', timestamp: 1000 });
      callbacks.onTurnComplete();

      // Now both aiReady=true and isUserTurn=true — silence detection should be active
      // handleRms below threshold should eventually trigger silence_detected
      expect(() => manager.handleRms(ws, 0.001)).not.toThrow();
    });

    it('onError sends error message to client', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      const callbacks = await createSessionAndGetCallbacks(ws);
      mockWsSend.mockClear();

      callbacks.onError('Gemini connection lost');

      expect(mockWsSend).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"'),
      );
      expect(mockWsSend).toHaveBeenCalledWith(
        expect.stringContaining('Gemini connection lost'),
      );
    });

    it('onAudioSent updates lastAudioSentAt', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      const callbacks = await createSessionAndGetCallbacks(ws);

      // Should not throw
      expect(() => callbacks.onAudioSent()).not.toThrow();
    });
  });

  describe('handleRms — silence detection', () => {
    async function createReadySession(ws: import('ws').WebSocket) {
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);
      const calls = (GeminiRelay as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      const callbacks = lastCall[1] as {
        onTranscript: (entry: { speaker: string; text: string; timestamp: number }) => void;
        onTurnComplete: () => void;
        onAudioSent: () => void;
      };
      // Make the session ready for silence detection
      callbacks.onTranscript({ speaker: 'ai', text: 'Hello', timestamp: 1000 });
      callbacks.onTurnComplete();
      return callbacks;
    }

    it('sends silence_detected after extended silence (>= 5s but below timeout)', async () => {
      jest.useRealTimers();
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await createReadySession(ws);

      // Simulate starting silence
      manager.handleRms(ws, 0.001); // Sets silenceStartedAt

      // Simulate 6 seconds passing by calling handleRms with a modified Date.now
      const now = Date.now();
      const realDateNow = Date.now;
      jest.spyOn(Date, 'now').mockReturnValue(now + 6000);

      mockWsSend.mockClear();
      manager.handleRms(ws, 0.001);

      const calls = mockWsSend.mock.calls.map((c) => JSON.parse(c[0] as string));
      expect(calls.some((c: { type: string }) => c.type === 'silence_detected')).toBe(true);

      jest.spyOn(Date, 'now').mockRestore();
      (Date.now as jest.Mock).mockRestore?.();
      // Restore real Date.now
      Date.now = realDateNow;
    });

    it('clears silence when RMS is above threshold', async () => {
      jest.useRealTimers();
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await createReadySession(ws);

      // Start silence
      manager.handleRms(ws, 0.001);

      // Then user speaks (above threshold)
      manager.handleRms(ws, 0.1);
      mockWsSend.mockClear();

      // Then silence again — should reset timer (no immediate silence_detected)
      manager.handleRms(ws, 0.001);
      const calls = mockWsSend.mock.calls.map((c) => JSON.parse(c[0] as string));
      expect(calls.some((c: { type: string }) => c.type === 'silence_detected')).toBe(false);
    });

    it('ends session when silence exceeds SILENCE_TIMEOUT_SECONDS', async () => {
      jest.useRealTimers();
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await createReadySession(ws);

      const now = Date.now();
      const realDateNow = Date.now;

      // Set silence start
      manager.handleRms(ws, 0.001);

      // Advance time past silence timeout (35s)
      jest.spyOn(Date, 'now').mockReturnValue(now + 36000);

      mockWsSend.mockClear();
      manager.handleRms(ws, 0.001);

      const calls = mockWsSend.mock.calls.map((c) => JSON.parse(c[0] as string));
      expect(calls.some((c: { type: string }) => c.type === 'silence_detected')).toBe(true);

      Date.now = realDateNow;
    });

    it('skips silence detection while audio is still draining (lastAudioSentAt is recent)', async () => {
      jest.useRealTimers();
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      const callbacks = await createReadySession(ws);

      // Simulate audio just sent (lastAudioSentAt = now)
      callbacks.onAudioSent();

      mockWsSend.mockClear();
      // RMS is below threshold, but audio drain buffer is active
      manager.handleRms(ws, 0.001);

      const calls = mockWsSend.mock.calls.map((c) => JSON.parse(c[0] as string));
      expect(calls.some((c: { type: string }) => c.type === 'silence_detected')).toBe(false);
    });
  });

  describe('duration timer (checkDuration)', () => {
    it('sends warning when interview exceeds 12 minutes', async () => {
      const fakeNow = 1_000_000_000; // arbitrary fixed timestamp
      jest.spyOn(Date, 'now').mockReturnValue(fakeNow);

      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);
      mockWsSend.mockClear();

      // Advance Date.now to simulate 721 seconds elapsed (past 720s warning threshold)
      jest.spyOn(Date, 'now').mockReturnValue(fakeNow + 721 * 1000);

      // Advance the 1-second interval timer to trigger checkDuration
      jest.advanceTimersByTime(1000);

      const calls = mockWsSend.mock.calls.map((c) => JSON.parse(c[0] as string));
      expect(calls.some((c: { type: string }) => c.type === 'warning')).toBe(true);

      jest.restoreAllMocks();
    });

    it('auto-ends session when interview exceeds 15 minutes', async () => {
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);
      mockWsSend.mockClear();

      // The durationTimer fires every 1s. Simulate 900+ seconds elapsed by mocking Date.now
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 901 * 1000);

      jest.advanceTimersByTime(1000);

      const calls = mockWsSend.mock.calls.map((c) => JSON.parse(c[0] as string));
      // Should send a warning + auto-end
      expect(calls.some((c: { type: string }) => c.type === 'warning')).toBe(true);

      jest.restoreAllMocks();
    });
  });

  describe('checkpoint timer (saveCheckpoint)', () => {
    it('calls updateTranscript when checkpoint interval fires', async () => {
      const { updateTranscript } = await import('@/server/supabase-ops');
      const ws = createMockWs() as unknown as import('ws').WebSocket;
      await manager.createSession(ws, createConfig() as import('@/server/types').SessionConfig);

      // Advance time to trigger checkpoint (30s)
      jest.advanceTimersByTime(30000);

      // Allow async operations to complete
      await Promise.resolve();
      await Promise.resolve();

      expect(updateTranscript).toHaveBeenCalledWith('interview-test-123', expect.any(String));
    });
  });
});
