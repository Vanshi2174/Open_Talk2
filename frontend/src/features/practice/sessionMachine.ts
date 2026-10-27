import {
  canSubmitTranscript,
  type PracticeSession,
  type SessionEvent,
} from './types'

export function createInitialSession(
  overrides: Partial<Pick<PracticeSession, 'mode' | 'difficulty'>> = {},
): PracticeSession {
  return {
    id: '',
    stage: 'setup',
    mode: overrides.mode ?? 'interview',
    difficulty: overrides.difficulty ?? 'standard',
    prompt: null,
    captureStatus: 'idle',
    captureError: null,
    interimTranscript: '',
    finalTranscript: '',
    editedTranscript: '',
    transcriptDirty: false,
    startedAt: null,
    stoppedAt: null,
    submittedAt: null,
  }
}

function joinSpeech(base: string, addition: string): string {
  const next = addition.replace(/\s+/g, ' ').trim()
  if (!next) return base
  if (!base) return next
  return `${base} ${next}`
}

function clearSpeech(session: PracticeSession, captureStatus: PracticeSession['captureStatus']): PracticeSession {
  return {
    ...session,
    captureStatus,
    captureError: null,
    interimTranscript: '',
    finalTranscript: '',
    editedTranscript: '',
    transcriptDirty: false,
    startedAt: null,
    stoppedAt: null,
    submittedAt: null,
  }
}

export function reducePracticeSession(session: PracticeSession, event: SessionEvent): PracticeSession {
  switch (event.type) {
    case 'configure': {
      if (session.stage !== 'setup') return session
      return {
        ...session,
        mode: event.mode ?? session.mode,
        difficulty: event.difficulty ?? session.difficulty,
      }
    }
    case 'begin': {
      if (session.stage !== 'setup') return session
      return {
        ...createInitialSession({ mode: session.mode, difficulty: session.difficulty }),
        id: event.id,
        stage: 'studio',
        prompt: event.prompt,
        captureStatus: 'idle',
      }
    }
    case 'capture_requesting': {
      if (session.stage !== 'studio') return session
      return {
        ...session,
        captureStatus: 'requesting',
        captureError: null,
      }
    }
    case 'capture_listening': {
      if (session.stage !== 'studio') return session
      return {
        ...session,
        captureStatus: 'listening',
        captureError: null,
        startedAt: session.startedAt ?? new Date().toISOString(),
        stoppedAt: null,
      }
    }
    case 'capture_unsupported': {
      if (session.stage !== 'studio') return session
      return {
        ...session,
        captureStatus: 'unsupported',
        captureError: 'This browser does not support speech recognition. You can still type your answer.',
      }
    }
    case 'permission_denied': {
      if (session.stage !== 'studio') return session
      return {
        ...session,
        captureStatus: 'permission_denied',
        captureError:
          'Microphone access was blocked. Allow the microphone in your browser, or type your answer instead.',
      }
    }
    case 'capture_error': {
      if (session.stage !== 'studio') return session
      return {
        ...session,
        captureStatus: 'error',
        captureError: event.message,
        interimTranscript: '',
      }
    }
    case 'interim': {
      if (session.stage !== 'studio' || session.captureStatus !== 'listening') return session
      if (session.transcriptDirty) return session
      return { ...session, interimTranscript: event.text }
    }
    case 'append_final': {
      if (session.stage !== 'studio') return session
      const finalTranscript = joinSpeech(session.finalTranscript, event.text)
      return {
        ...session,
        finalTranscript,
        interimTranscript: '',
        editedTranscript: session.transcriptDirty
          ? session.editedTranscript
          : finalTranscript,
      }
    }
    case 'stop': {
      if (session.stage !== 'studio') return session
      if (session.captureStatus !== 'listening' && session.captureStatus !== 'requesting') {
        return session
      }
      const folded = session.transcriptDirty
        ? session.editedTranscript
        : joinSpeech(session.finalTranscript, session.interimTranscript)
      return {
        ...session,
        captureStatus: 'stopped',
        captureError: null,
        interimTranscript: '',
        finalTranscript: session.transcriptDirty ? session.finalTranscript : folded,
        editedTranscript: folded,
        stoppedAt: new Date().toISOString(),
      }
    }
    case 'retry': {
      if (session.stage !== 'studio') return session
      return clearSpeech(session, session.captureStatus === 'unsupported' ? 'unsupported' : 'idle')
    }
    case 'edit_transcript': {
      if (session.stage !== 'studio') return session
      if (session.captureStatus === 'listening' || session.captureStatus === 'requesting') {
        return session
      }
      return {
        ...session,
        editedTranscript: event.text,
        transcriptDirty: true,
      }
    }
    case 'submit': {
      if (!canSubmitTranscript(session)) return session
      return {
        ...session,
        stage: 'complete',
        submittedAt: event.submittedAt,
        captureStatus: 'stopped',
        interimTranscript: '',
      }
    }
    case 'reset_setup': {
      return createInitialSession({ mode: session.mode, difficulty: session.difficulty })
    }
    default: {
      return session
    }
  }
}
