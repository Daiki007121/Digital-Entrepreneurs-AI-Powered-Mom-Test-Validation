// Implements #6: Audio capture and playback hook
'use client';

import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AudioStreamer } from '@/lib/audio-streamer';
import { RMS_SILENCE_THRESHOLD } from '@/lib/constants';

interface AudioSessionCallbacks {
  onAudioData: (base64Audio: string) => void;
  onRmsValue: (rms: number) => void;
  /** Fired when user is silent for a set duration (e.g. 2 seconds) */
  onSilenceTimeout?: () => void;
}

interface AudioSessionReturn {
  isCapturing: boolean;
  isMuted: boolean;
  startCapture: (callbacks: AudioSessionCallbacks) => Promise<number | void>;
  stopCapture: () => void;
  toggleMute: () => void;
  playAudio: (base64Audio: string) => void;
  stopPlayback: () => void;
}

/**
 * Converts a Float32Array audio buffer to base64-encoded PCM16.
 */
function float32ToPCM16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Computes RMS (Root Mean Square) of an audio buffer.
 */
function computeRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * Hook for managing audio capture (microphone) and playback (AI response).
 * Uses ScriptProcessorNode for mic capture and AudioStreamer for playback.
 */
export function useAudioSession(): AudioSessionReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const callbacksRef = useRef<AudioSessionCallbacks | null>(null);
  const isMutedRef = useRef(false);

  // For 2-second explicit turn-completion signaling
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSilentRef = useRef(true);
  const hasSpokenRef = useRef(false);

  const startCapture = useCallback(async (callbacks: AudioSessionCallbacks) => {
    callbacksRef.current = callbacks;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      // Browser autoplay policy may suspend AudioContext created outside user gestures
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessorNode for PCM16 capture (buffer size 2048 for lower latency)
      const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      scriptProcessor.onaudioprocess = (event) => {
        if (isMutedRef.current) return;

        const inputData = event.inputBuffer.getChannelData(0);
        const rms = computeRMS(inputData);

        callbacksRef.current?.onRmsValue(rms);

        // Turn Complete Signaling Logic (2-second silence detector)
        if (rms < RMS_SILENCE_THRESHOLD) {
          if (!isSilentRef.current) {
            isSilentRef.current = true;
            // Only start the 2-second timer to end their turn if they have spoken previously 
            // during this turn
            if (hasSpokenRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                callbacksRef.current?.onSilenceTimeout?.();
                hasSpokenRef.current = false; // Reset for next turn
              }, 2000);
            }
          }
        } else {
          if (isSilentRef.current) {
            isSilentRef.current = false;
            // User started speaking again; clear the end-turn timer and mark them as speaking
            hasSpokenRef.current = true;
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          }
        }

        // Always send audio continuously. Gemini's VAD requires continuous
        // audio (including silence) to correctly detect when the user stops speaking.
        const base64 = float32ToPCM16Base64(inputData);
        callbacksRef.current?.onAudioData(base64);
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      // Initialize AudioStreamer for playback
      streamerRef.current = new AudioStreamer(audioContext);

      setIsCapturing(true);
      return audioContext.sampleRate;
    } catch (err) {
      // Release any partially initialized audio resources
      scriptProcessorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioContextRef.current?.state !== 'closed') {
        void audioContextRef.current?.close();
      }
      scriptProcessorRef.current = null;
      sourceRef.current = null;
      streamRef.current = null;
      audioContextRef.current = null;

      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        toast.error(
          'Microphone access denied. Please allow microphone access in your browser settings.',
        );
      } else {
        toast.error('Failed to access microphone. Please check your audio settings.');
      }
    }
  }, []);

  const stopCapture = useCallback(() => {
    scriptProcessorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamerRef.current?.stop();

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }

    scriptProcessorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    streamerRef.current = null;
    callbacksRef.current = null;
    isSilentRef.current = true;

    setIsCapturing(false);
    setIsMuted(false);
    isMutedRef.current = false;
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      // If user manually mutes, we might consider that an end-of-turn if we wanted,
      // but for now, we just stop sending data.
      return next;
    });
  }, []);

  const playAudio = useCallback((base64Audio: string) => {
    // Defensive resume — AudioContext can be re-suspended by tab backgrounding
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    // As long as AI is playing audio, we don't want to accidentally trigger turn completion
    // if the user's mic is quiet (the AI is holding the floor). Our UI state ('speaking' vs 'listening')
    // ideally manages when we *send* the turn completion, but we'll reset timer here as a fallback.
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
      isSilentRef.current = true; // wait for them to speak again
    }

    streamerRef.current?.addPCM16Chunk(base64Audio);
  }, []);

  const stopPlayback = useCallback(() => {
    streamerRef.current?.stop();
  }, []);

  return {
    isCapturing,
    isMuted,
    startCapture,
    stopCapture,
    toggleMute,
    playAudio,
    stopPlayback,
  };
}
