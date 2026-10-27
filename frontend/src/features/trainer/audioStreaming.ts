// Audio streaming utilities for Gemini Multimodal Live API (16kHz PCM in, 24kHz PCM out)

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer as ArrayBuffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number,
): Int16Array {
  if (inputSampleRate === outputSampleRate) {
    const result = new Int16Array(buffer.length)
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]))
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return result
  }

  const sampleRatio = inputSampleRate / outputSampleRate
  const newLength = Math.round(buffer.length / sampleRatio)
  const result = new Int16Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRatio)
    let accum = 0
    let count = 0
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i]
      count++
    }
    const sample = count > 0 ? accum / count : 0
    const clamped = Math.max(-1, Math.min(1, sample))
    result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }

  return result
}

export class LiveAudioRecorder {
  private onAudioChunk: (base64Pcm: string) => void
  private onVolumeChange: ((volume: number) => void) | undefined
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private processorNode: ScriptProcessorNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private isRecording = false
  private isMuted = false

  constructor(
    onAudioChunk: (base64Pcm: string) => void,
    onVolumeChange?: (volume: number) => void,
  ) {
    this.onAudioChunk = onAudioChunk
    this.onVolumeChange = onVolumeChange
  }

  public async start(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    this.mediaStream = stream

    const AudioContextClass =
      window.AudioContext ||
      // @ts-expect-error webkitAudioContext support
      window.webkitAudioContext

    this.audioContext = new AudioContextClass()
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    const inputSampleRate = this.audioContext.sampleRate
    this.sourceNode = this.audioContext.createMediaStreamSource(stream)

    // 4096 buffer size: ~85ms at 48kHz, good balance between responsiveness and overhead
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1)

    this.processorNode.onaudioprocess = (event) => {
      if (!this.isRecording || this.isMuted) {
        if (this.onVolumeChange) this.onVolumeChange(0)
        return
      }

      const inputData = event.inputBuffer.getChannelData(0)

      // RMS for live visual meter
      let sum = 0
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i]
      }
      const rms = Math.sqrt(sum / inputData.length)
      if (this.onVolumeChange) {
        this.onVolumeChange(Math.min(1, rms * 5))
      }

      // Convert to 16kHz Linear PCM 16-bit
      const pcm16 = downsampleBuffer(inputData, inputSampleRate, 16000)
      const base64 = arrayBufferToBase64(pcm16.buffer as ArrayBuffer)
      this.onAudioChunk(base64)
    }

    this.sourceNode.connect(this.processorNode)
    this.processorNode.connect(this.audioContext.destination)
    this.isRecording = true

    return stream
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted
      })
    }
  }

  public stop(): void {
    this.isRecording = false
    if (this.processorNode && this.sourceNode) {
      this.processorNode.disconnect()
      this.sourceNode.disconnect()
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {})
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }
    if (this.onVolumeChange) {
      this.onVolumeChange(0)
    }
  }
}

export class LiveAudioPlayer {
  private onSpeakingStateChange: ((speaking: boolean) => void) | undefined
  private audioContext: AudioContext | null = null
  private nextPlayTime = 0
  private activeSources: AudioBufferSourceNode[] = []
  private isSpeaking = false

  constructor(onSpeakingStateChange?: (speaking: boolean) => void) {
    this.onSpeakingStateChange = onSpeakingStateChange
  }

  private initContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        // @ts-expect-error webkitAudioContext support
        window.webkitAudioContext
      this.audioContext = new AudioContextClass({ sampleRate: 24000 })
      this.nextPlayTime = 0
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {})
    }
    return this.audioContext
  }

  public playChunk(base64Pcm: string): void {
    const ctx = this.initContext()
    const rawBuffer = base64ToArrayBuffer(base64Pcm)
    const int16Array = new Int16Array(rawBuffer)
    const length = int16Array.length
    if (length === 0) return

    // Convert Int16Array to Float32Array [-1.0, 1.0]
    const audioBuffer = ctx.createBuffer(1, length, 24000)
    const channelData = audioBuffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      channelData[i] = int16Array[i] / 32768.0
    }

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)

    const currentTime = ctx.currentTime
    const startTime = Math.max(currentTime, this.nextPlayTime)
    source.start(startTime)
    this.nextPlayTime = startTime + audioBuffer.duration
    this.activeSources.push(source)

    if (!this.isSpeaking) {
      this.isSpeaking = true
      if (this.onSpeakingStateChange) this.onSpeakingStateChange(true)
    }

    source.onended = () => {
      const index = this.activeSources.indexOf(source)
      if (index > -1) {
        this.activeSources.splice(index, 1)
      }
      if (this.activeSources.length === 0 && ctx.currentTime >= this.nextPlayTime - 0.05) {
        this.isSpeaking = false
        if (this.onSpeakingStateChange) this.onSpeakingStateChange(false)
      }
    }
  }

  public stopAndClear(): void {
    for (const source of this.activeSources) {
      try {
        source.stop()
        source.disconnect()
      } catch {
        // Already finished
      }
    }
    this.activeSources = []
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime
    }
    if (this.isSpeaking) {
      this.isSpeaking = false
      if (this.onSpeakingStateChange) this.onSpeakingStateChange(false)
    }
  }

  public close(): void {
    this.stopAndClear()
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {})
      this.audioContext = null
    }
  }
}
