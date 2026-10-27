export const PRACTICE_MODES = ['interview', 'public_speaking', 'conversation'] as const
export type PracticeMode = (typeof PRACTICE_MODES)[number]

export const DIFFICULTIES = ['warm_up', 'standard', 'stretch'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export type SessionStage = 'setup' | 'studio' | 'complete'

export type CaptureStatus =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'stopped'
  | 'unsupported'
  | 'permission_denied'
  | 'error'

export type PracticePrompt = {
  id: string
  mode: PracticeMode
  difficulty: Difficulty
  title: string
  text: string
  guidance: string
}

export type PracticeSession = {
  id: string
  stage: SessionStage
  mode: PracticeMode
  difficulty: Difficulty
  prompt: PracticePrompt | null
  captureStatus: CaptureStatus
  captureError: string | null
  interimTranscript: string
  finalTranscript: string
  editedTranscript: string
  transcriptDirty: boolean
  startedAt: string | null
  stoppedAt: string | null
  submittedAt: string | null
}

export type SessionEvent =
  | { type: 'configure'; mode?: PracticeMode; difficulty?: Difficulty }
  | { type: 'begin'; id: string; prompt: PracticePrompt }
  | { type: 'capture_requesting' }
  | { type: 'capture_listening' }
  | { type: 'capture_unsupported' }
  | { type: 'permission_denied' }
  | { type: 'capture_error'; message: string }
  | { type: 'interim'; text: string }
  | { type: 'append_final'; text: string }
  | { type: 'stop' }
  | { type: 'retry' }
  | { type: 'edit_transcript'; text: string }
  | { type: 'submit'; submittedAt: string }
  | { type: 'reset_setup' }

export function displayTranscript(session: PracticeSession): string {
  if (session.transcriptDirty) {
    return session.editedTranscript
  }
  const finalText = session.finalTranscript.trim()
  const interim = session.interimTranscript.trim()
  if (finalText && interim) return `${finalText} ${interim}`
  return finalText || interim
}

export function canSubmitTranscript(session: PracticeSession): boolean {
  if (session.stage !== 'studio') return false
  if (session.captureStatus === 'listening' || session.captureStatus === 'requesting') {
    return false
  }
  return displayTranscript(session).trim().length > 0
}
