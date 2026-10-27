import {
  getSpeechRecognitionCtor,
  isWebSpeechSupported,
  mapRecognitionError,
  type SpeechRecognitionLike,
} from './support'
import type { SpeechCapture, SpeechCaptureListener } from './types'

function collectTranscript(event: {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }>
}): { interim: string; finals: string[] } {
  const finals: string[] = []
  let interim = ''
  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index]
    const text = result?.[0]?.transcript ?? ''
    if (result?.isFinal) {
      finals.push(text)
    } else {
      interim += text
    }
  }
  return { interim, finals }
}

export class WebSpeechCapture implements SpeechCapture {
  readonly provider = 'web-speech' as const
  private listener: SpeechCaptureListener | null = null
  private recognition: SpeechRecognitionLike | null = null
  private shouldRun = false
  private mediaStream: MediaStream | null = null

  isSupported(): boolean {
    return isWebSpeechSupported()
  }

  async start(listener: SpeechCaptureListener): Promise<void> {
    this.disposeInternal(false)
    this.listener = listener

    if (!this.isSupported()) {
      listener({ type: 'unsupported' })
      return
    }

    listener({ type: 'requesting' })

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.releaseMedia()
    } catch {
      listener({ type: 'permission-denied' })
      this.listener = null
      return
    }

    const Recognition = getSpeechRecognitionCtor()
    if (!Recognition) {
      listener({ type: 'unsupported' })
      return
    }

    this.shouldRun = true
    this.recognition = new Recognition()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = 'en-US'

    this.recognition.onresult = (event) => {
      const { interim, finals } = collectTranscript(event)
      for (const chunk of finals) {
        if (chunk.trim()) {
          this.listener?.({ type: 'final', text: chunk })
        }
      }
      this.listener?.({ type: 'interim', text: interim })
    }

    this.recognition.onerror = (event) => {
      const mapped = mapRecognitionError(event.error)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.shouldRun = false
        this.listener?.({ type: 'permission-denied' })
        return
      }
      if (!mapped.fatal) {
        return
      }
      this.shouldRun = false
      this.listener?.({ type: 'error', message: mapped.message })
    }

    this.recognition.onend = () => {
      if (this.shouldRun && this.recognition) {
        try {
          this.recognition.start()
          return
        } catch {
          this.shouldRun = false
          this.listener?.({
            type: 'error',
            message: 'Speech recognition stopped unexpectedly. You can retry or type your answer.',
          })
          return
        }
      }
      this.listener?.({ type: 'end' })
    }

    try {
      this.recognition.start()
      this.listener?.({ type: 'start' })
    } catch {
      this.shouldRun = false
      this.listener?.({
        type: 'error',
        message: 'Speech recognition could not start. You can retry or type your answer.',
      })
    }
  }

  stop(): void {
    this.shouldRun = false
    try {
      this.recognition?.stop()
    } catch {
      this.listener?.({ type: 'end' })
    }
    this.releaseMedia()
  }

  dispose(): void {
    this.disposeInternal(true)
  }

  private disposeInternal(clearListener: boolean): void {
    this.shouldRun = false
    try {
      this.recognition?.abort()
    } catch {
      // Recognition may already be closed.
    }
    this.recognition = null
    this.releaseMedia()
    if (clearListener) {
      this.listener = null
    }
  }

  private releaseMedia(): void {
    this.mediaStream?.getTracks().forEach((track) => track.stop())
    this.mediaStream = null
  }
}
