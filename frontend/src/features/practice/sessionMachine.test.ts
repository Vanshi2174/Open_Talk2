import { describe, expect, it } from 'vitest'
import { PRACTICE_PROMPTS } from './prompts'
import { createInitialSession, reducePracticeSession } from './sessionMachine'
import { canSubmitTranscript } from './types'

const prompt = PRACTICE_PROMPTS[0]

function studioSession() {
  return reducePracticeSession(createInitialSession({ mode: 'interview', difficulty: 'warm_up' }), {
    type: 'begin',
    id: 'session-1',
    prompt,
  })
}

describe('reducePracticeSession', () => {
  it('configures mode and difficulty only during setup', () => {
    const setup = reducePracticeSession(createInitialSession(), {
      type: 'configure',
      mode: 'conversation',
      difficulty: 'stretch',
    })
    expect(setup.mode).toBe('conversation')
    expect(setup.difficulty).toBe('stretch')

    const live = reducePracticeSession(studioSession(), {
      type: 'configure',
      mode: 'public_speaking',
    })
    expect(live.mode).toBe('interview')
  })

  it('starts a studio session from setup', () => {
    const next = studioSession()
    expect(next.stage).toBe('studio')
    expect(next.id).toBe('session-1')
    expect(next.prompt?.id).toBe(prompt.id)
    expect(next.captureStatus).toBe('idle')
  })

  it('tracks listening, transcript, stop, and edit', () => {
    let session = studioSession()
    session = reducePracticeSession(session, { type: 'capture_listening' })
    session = reducePracticeSession(session, { type: 'interim', text: 'hello there' })
    expect(session.interimTranscript).toBe('hello there')
    session = reducePracticeSession(session, { type: 'append_final', text: 'hello there' })
    expect(session.finalTranscript).toBe('hello there')
    session = reducePracticeSession(session, { type: 'stop' })
    expect(session.captureStatus).toBe('stopped')
    session = reducePracticeSession(session, { type: 'edit_transcript', text: 'Hello there.' })
    expect(session.editedTranscript).toBe('Hello there.')
    expect(session.transcriptDirty).toBe(true)
  })

  it('rejects empty submit and accepts a reviewed transcript', () => {
    const empty = studioSession()
    expect(canSubmitTranscript(empty)).toBe(false)
    const unchanged = reducePracticeSession(empty, {
      type: 'submit',
      submittedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(unchanged.stage).toBe('studio')

    let session = reducePracticeSession(empty, { type: 'append_final', text: 'I led the launch.' })
    session = reducePracticeSession(session, { type: 'stop' })
    expect(canSubmitTranscript(session)).toBe(true)
    session = reducePracticeSession(session, {
      type: 'submit',
      submittedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(session.stage).toBe('complete')
    expect(session.submittedAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('does not submit while listening', () => {
    let session = studioSession()
    session = reducePracticeSession(session, { type: 'append_final', text: 'Working draft' })
    session = reducePracticeSession(session, { type: 'capture_listening' })
    expect(canSubmitTranscript(session)).toBe(false)
  })

  it('retry clears speech but keeps the prompt', () => {
    let session = studioSession()
    session = reducePracticeSession(session, { type: 'append_final', text: 'scratch this' })
    session = reducePracticeSession(session, { type: 'retry' })
    expect(session.finalTranscript).toBe('')
    expect(session.editedTranscript).toBe('')
    expect(session.prompt?.id).toBe(prompt.id)
    expect(session.captureStatus).toBe('idle')
  })

  it('records permission and unsupported states without inventing a live model', () => {
    let session = studioSession()
    session = reducePracticeSession(session, { type: 'permission_denied' })
    expect(session.captureStatus).toBe('permission_denied')
    expect(session.captureError).toMatch(/microphone/i)

    session = reducePracticeSession(studioSession(), { type: 'capture_unsupported' })
    expect(session.captureStatus).toBe('unsupported')
    expect(session.captureError).toMatch(/type your answer/i)
  })
})
