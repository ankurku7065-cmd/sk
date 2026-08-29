/**
 * Audio Pipeline for Gemini Live Audio & Web Audio API
 * - Input: 16kHz PCM (Linear 16-bit little-endian)
 * - Output: 24kHz PCM from Gemini Live model
 */

// Convert Float32Array to 16-bit linear PCM and Base64 encode
export function floatTo16BitPCMBase64(float32Array: Float32Array): string {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    // 16-bit signed integer (-32768 to 32767)
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 16-bit linear PCM to AudioBuffer for 24kHz playback
export function pcmBase64ToAudioBuffer(
  base64Data: string,
  audioCtx: AudioContext,
  sampleRate = 24000
): AudioBuffer {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }

  const audioBuffer = audioCtx.createBuffer(1, float32Array.length, sampleRate);
  audioBuffer.copyToChannel(float32Array, 0);
  return audioBuffer;
}

export class LiveAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  public analyser: AnalyserNode | null = null;
  public onPlayStateChange?: (isPlaying: boolean) => void;
  private isPlayingState = false;

  constructor() {
    // Lazy initialized when user interacts
  }

  public ensureContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public playChunk(base64PCM: string) {
    try {
      const ctx = this.ensureContext();
      const audioBuffer = pcmBase64ToAudioBuffer(base64PCM, ctx, 24000);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      if (this.analyser) {
        source.connect(this.analyser);
        this.analyser.connect(ctx.destination);
      } else {
        source.connect(ctx.destination);
      }

      const currentTime = ctx.currentTime;
      // If nextStartTime is in the past, schedule immediately
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSources.push(source);

      if (!this.isPlayingState) {
        this.isPlayingState = true;
        this.onPlayStateChange?.(true);
      }

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
        if (this.activeSources.length === 0) {
          this.isPlayingState = false;
          this.onPlayStateChange?.(false);
        }
      };
    } catch (err) {
      console.error('Failed to play audio chunk:', err);
    }
  }

  public interrupt() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // already stopped
      }
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
    if (this.isPlayingState) {
      this.isPlayingState = false;
      this.onPlayStateChange?.(false);
    }
  }

  public close() {
    this.interrupt();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

export class LiveAudioRecorder {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  public analyser: AnalyserNode | null = null;
  private onAudioDataCallback: ((base64PCM16k: string) => void) | null = null;

  public async start(onAudioData: (base64PCM16k: string) => void): Promise<void> {
    this.onAudioDataCallback = onAudioData;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.mediaStream = stream;

    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtxClass({ sampleRate: 16000 });
    
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;

    this.sourceNode = this.audioCtx.createMediaStreamSource(stream);
    // Buffer size 4096 gives approx 256ms chunk at 16kHz
    this.processorNode = this.audioCtx.createScriptProcessor(4096, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.onAudioDataCallback) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const base64PCM = floatTo16BitPCMBase64(inputData);
      this.onAudioDataCallback(base64PCM);
    };

    this.sourceNode.connect(this.analyser);
    this.analyser.connect(this.processorNode);
    this.processorNode.connect(this.audioCtx.destination);
  }

  public stop() {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.onAudioDataCallback = null;
  }
}
