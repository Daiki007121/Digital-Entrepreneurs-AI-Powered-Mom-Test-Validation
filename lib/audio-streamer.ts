// Implements #6: AudioStreamer — smooth playback of streaming audio chunks via Web Audio API
// Ported from teammate's alpha

/**
 * Plays streaming PCM16 audio chunks via Web Audio API.
 * Buffers chunks and schedules them for gapless playback.
 */
export class AudioStreamer {
  private context: AudioContext;
  private gainNode: GainNode;
  private scheduledTime: number = 0;
  private sampleRate: number;
  private isPlaying: boolean = false;

  constructor(context: AudioContext, sampleRate: number = 24000) {
    this.context = context;
    this.sampleRate = sampleRate;
    this.gainNode = context.createGain();
    this.gainNode.connect(context.destination);
  }

  /**
   * Adds a base64-encoded PCM16 audio chunk to the playback queue.
   */
  addPCM16Chunk(base64Audio: string): void {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    const audioBuffer = this.context.createBuffer(1, float32Array.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    const now = this.context.currentTime;
    const startTime = Math.max(now, this.scheduledTime);
    source.start(startTime);
    this.scheduledTime = startTime + audioBuffer.duration;
    this.isPlaying = true;
  }

  /**
   * Stops all scheduled audio and resets the queue.
   */
  stop(): void {
    this.scheduledTime = 0;
    this.isPlaying = false;
  }

  /**
   * Sets the playback volume (0.0 to 1.0).
   */
  setVolume(volume: number): void {
    this.gainNode.gain.setValueAtTime(
      Math.max(0, Math.min(1, volume)),
      this.context.currentTime,
    );
  }

  get playing(): boolean {
    return this.isPlaying && this.context.currentTime < this.scheduledTime;
  }
}
