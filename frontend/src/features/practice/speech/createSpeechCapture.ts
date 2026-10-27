import type { SpeechCapture, SpeechCaptureListener, SpeechCaptureProvider } from './types'
import { WebSpeechCapture } from './webSpeechCapture'

/**
 * Phase 4 will swap this factory to a Gemini Live capture that streams audio
 * in real time. Phase 3 only exposes browser speech recognition and never
 * claims a live model is connected.
 */
export function createSpeechCapture(
  provider: SpeechCaptureProvider = 'web-speech',
): SpeechCapture {
  if (provider === 'gemini-live') {
    return new UnavailableLiveCapture()
  }
  return new WebSpeechCapture()
}

class UnavailableLiveCapture implements SpeechCapture {
  readonly provider = 'gemini-live' as const

  isSupported(): boolean {
    return false
  }

  async start(listener: SpeechCaptureListener): Promise<void> {
    listener({ type: 'unsupported' })
  }

  stop(): void {
    // No live session exists in this phase.
  }

  dispose(): void {
    // No live session exists in this phase.
  }
}
