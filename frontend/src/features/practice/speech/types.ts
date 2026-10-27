export type SpeechCaptureProvider = 'web-speech' | 'gemini-live'

export type SpeechCaptureEvent =
  | { type: 'requesting' }
  | { type: 'unsupported' }
  | { type: 'permission-denied' }
  | { type: 'start' }
  | { type: 'interim'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; message: string }
  | { type: 'end' }

export type SpeechCaptureListener = (event: SpeechCaptureEvent) => void

export interface SpeechCapture {
  readonly provider: SpeechCaptureProvider
  isSupported(): boolean
  start(listener: SpeechCaptureListener): Promise<void>
  stop(): void
  dispose(): void
}
