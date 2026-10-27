export type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

export type SpeechRecognitionResultEventLike = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0?: { transcript: string }
  }>
}

export type SpeechRecognitionCtor = new () => SpeechRecognitionLike

export function getSpeechRecognitionCtor(
  globalObject: Window & typeof globalThis = window,
): SpeechRecognitionCtor | null {
  const candidate = globalObject as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null
}

export function isWebSpeechSupported(
  globalObject: Window & typeof globalThis = window,
): boolean {
  if (typeof globalObject === 'undefined') return false
  const hasRecognition = Boolean(getSpeechRecognitionCtor(globalObject))
  const hasMedia =
    typeof globalObject.navigator !== 'undefined' &&
    Boolean(globalObject.navigator.mediaDevices?.getUserMedia)
  return hasRecognition && hasMedia
}

export function mapRecognitionError(code: string): { fatal: boolean; message: string } {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return {
        fatal: true,
        message:
          'Microphone access was blocked. Allow the microphone in your browser, or type your answer instead.',
      }
    case 'audio-capture':
      return {
        fatal: true,
        message: 'No microphone was found. Connect a microphone or type your answer.',
      }
    case 'network':
      return {
        fatal: true,
        message: 'Speech recognition lost its network connection. Check your connection and try again.',
      }
    case 'no-speech':
      return {
        fatal: false,
        message: 'No speech was heard. Start again when you are ready.',
      }
    case 'aborted':
      return { fatal: false, message: '' }
    default:
      return {
        fatal: true,
        message: 'Speech recognition hit a problem. You can retry or type your answer.',
      }
  }
}
