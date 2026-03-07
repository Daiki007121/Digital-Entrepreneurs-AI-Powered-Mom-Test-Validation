// Implements #3: Gemini Live API relay server
import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from './types.js';
import { SessionManager } from './session-manager.js';

const PORT = Number(process.env.PORT) || 8081;
const REQUIRED_ENV = ['GOOGLE_AI_API_KEY'];

/** Validate required environment variables are set */
function validateEnv(): void {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

validateEnv();

const app: Express = express();
app.use(cors());
app.use(express.json());

/** Health check endpoint */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const sessionManager = new SessionManager();

wss.on('connection', (ws: WebSocket) => {
  console.log('[WS] Client connected');

  ws.on('message', async (raw: Buffer | string) => {
    try {
      const message: ClientMessage = JSON.parse(
        typeof raw === 'string' ? raw : raw.toString(),
      );

      switch (message.type) {
        case 'start_session': {
          if (!message.config) {
            sendError(ws, 'Missing session config');
            return;
          }
          await sessionManager.createSession(ws, message.config);
          break;
        }

        case 'audio': {
          if (!message.data) {
            sendError(ws, 'Missing audio data');
            return;
          }
          sessionManager.handleAudio(ws, message.data);
          break;
        }

        case 'rms': {
          if (message.rms === undefined) {
            sendError(ws, 'Missing RMS value');
            return;
          }
          sessionManager.handleRms(ws, message.rms);
          break;
        }

        case 'end_session': {
          await sessionManager.endSession(ws);
          break;
        }

        default: {
          sendError(ws, `Unknown message type: ${(message as ClientMessage).type}`);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[WS] Message handling error:', errorMessage);
      sendError(ws, errorMessage);
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    sessionManager.handleDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
    sessionManager.handleDisconnect(ws);
  });
});

/** Send an error message to the client */
function sendError(ws: WebSocket, message: string): void {
  const msg: ServerMessage = { type: 'error', message };
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

/** Graceful shutdown */
function shutdown(): void {
  console.log('[Server] Shutting down...');
  sessionManager.closeAll();
  wss.close(() => {
    server.close(() => {
      console.log('[Server] Shut down complete');
      process.exit(0);
    });
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => {
  console.log(`[Server] Relay server running on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
});

export { app, server, wss };
