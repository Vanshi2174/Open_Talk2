import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { createPracticeSession } from '../../services/api'
import type { PersistSessionPayload, SavedPracticeSession, SaveState } from '../../types/sessions'
import { selectPrompt } from './prompts'
import { createInitialSession, reducePracticeSession } from './sessionMachine'
import { createSpeechCapture } from './speech/createSpeechCapture'
import type { SpeechCapture } from './speech/types'
import { canSubmitTranscript, type Difficulty, type PracticeMode, type PracticeSession, type SessionEvent } from './types'

export type UsePracticeSessionOptions = {
  initialMode?: PracticeMode
  initialDifficulty?: Difficulty
  createCapture?: () => SpeechCapture
  createId?: () => string
  persistSession?: (payload: PersistSessionPayload) => Promise<SavedPracticeSession>
}

export function usePracticeSession(options: UsePracticeSessionOptions = {}) {
  const {
    initialMode,
    initialDifficulty,
    createCapture = createSpeechCapture,
    createId = () => crypto.randomUUID(),
    persistSession = createPracticeSession,
  } = options

  const [session, dispatch] = useReducer(
    reducePracticeSession,
    { mode: initialMode, difficulty: initialDifficulty },
    createInitialSession,
  )
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' })
  const captureRef = useRef<SpeechCapture | null>(null)
  const sessionRef = useRef<PracticeSession>(session)
  const persistRef = useRef(persistSession)
  sessionRef.current = session
  persistRef.current = persistSession

  const emit = useCallback((event: SessionEvent) => {
    dispatch(event)
  }, [])

  const disposeCapture = useCallback(() => {
    captureRef.current?.dispose()
    captureRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      disposeCapture()
    }
  }, [disposeCapture])

  const configure = useCallback(
    (next: { mode?: PracticeMode; difficulty?: Difficulty }) => {
      emit({ type: 'configure', ...next })
    },
    [emit],
  )

  const begin = useCallback(() => {
    const current = sessionRef.current
    emit({
      type: 'begin',
      id: createId(),
      prompt: selectPrompt(current.mode, current.difficulty),
    })
  }, [createId, emit])

  const startListening = useCallback(async () => {
    disposeCapture()
    const capture = createCapture()
    captureRef.current = capture
    emit({ type: 'capture_requesting' })
    await capture.start((event) => {
      switch (event.type) {
        case 'requesting':
          emit({ type: 'capture_requesting' })
          break
        case 'unsupported':
          emit({ type: 'capture_unsupported' })
          break
        case 'permission-denied':
          emit({ type: 'permission_denied' })
          break
        case 'start':
          emit({ type: 'capture_listening' })
          break
        case 'interim':
          emit({ type: 'interim', text: event.text })
          break
        case 'final':
          emit({ type: 'append_final', text: event.text })
          break
        case 'error':
          emit({ type: 'capture_error', message: event.message })
          break
        case 'end':
          if (sessionRef.current.captureStatus === 'listening') {
            emit({ type: 'stop' })
          }
          break
        default:
          break
      }
    })
  }, [createCapture, disposeCapture, emit])

  const stopListening = useCallback(() => {
    captureRef.current?.stop()
    emit({ type: 'stop' })
  }, [emit])

  const retry = useCallback(() => {
    disposeCapture()
    emit({ type: 'retry' })
  }, [disposeCapture, emit])

  const editTranscript = useCallback(
    (text: string) => {
      emit({ type: 'edit_transcript', text })
    },
    [emit],
  )

  const persistCurrent = useCallback(async (current: PracticeSession, submittedAt: string) => {
    if (!current.prompt) {
      setSaveState({ status: 'error', message: 'This session is missing a prompt.' })
      return
    }
    const transcript = current.editedTranscript.trim() || current.finalTranscript.trim()
    setSaveState({ status: 'saving' })
    try {
      const saved = await persistRef.current({
        id: current.id,
        mode: current.mode,
        difficulty: current.difficulty,
        prompt: {
          id: current.prompt.id,
          title: current.prompt.title,
          text: current.prompt.text,
        },
        transcript,
        started_at: current.startedAt,
        stopped_at: current.stoppedAt,
        submitted_at: submittedAt,
      })
      setSaveState({ status: 'saved', session: saved })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save this session.'
      setSaveState({ status: 'error', message })
    }
  }, [])

  const submit = useCallback(() => {
    const current = sessionRef.current
    if (!canSubmitTranscript(current)) return
    disposeCapture()
    const submittedAt = new Date().toISOString()
    emit({ type: 'submit', submittedAt })
    void persistCurrent(current, submittedAt)
  }, [disposeCapture, emit, persistCurrent])

  const retrySave = useCallback(() => {
    const current = sessionRef.current
    if (current.stage !== 'complete' || !current.submittedAt) return
    void persistCurrent(current, current.submittedAt)
  }, [persistCurrent])

  const backToSetup = useCallback(() => {
    disposeCapture()
    setSaveState({ status: 'idle' })
    emit({ type: 'reset_setup' })
  }, [disposeCapture, emit])

  return {
    session,
    saveState,
    configure,
    begin,
    startListening,
    stopListening,
    retry,
    editTranscript,
    submit,
    retrySave,
    backToSetup,
  }
}
