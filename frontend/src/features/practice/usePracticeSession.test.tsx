import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SpeechCapture, SpeechCaptureListener } from './speech/types'
import { usePracticeSession } from './usePracticeSession'

class FakeCapture implements SpeechCapture {
  readonly provider = 'web-speech' as const
  listener: SpeechCaptureListener | null = null
  supported = true

  isSupported(): boolean {
    return this.supported
  }

  async start(listener: SpeechCaptureListener): Promise<void> {
    this.listener = listener
    listener({ type: 'start' })
  }

  stop(): void {
    this.listener?.({ type: 'end' })
  }

  dispose(): void {
    this.listener = null
  }
}

describe('usePracticeSession', () => {
  it('runs start, transcript, stop, and submit through a capture adapter', async () => {
    const capture = new FakeCapture()
    const persistSession = vi.fn(async (payload) => ({
      id: payload.id,
      mode: payload.mode,
      difficulty: payload.difficulty,
      prompt: payload.prompt,
      transcript: payload.transcript,
      started_at: payload.started_at,
      stopped_at: payload.stopped_at,
      submitted_at: payload.submitted_at,
      created_at: payload.submitted_at,
      coaching_source: 'local' as const,
      coaching: {
        summary: 'Saved locally for the test.',
        strengths: ['Clear ask.'],
        improvements: ['Add a result.'],
        grammar_notes: ['None.'],
        clarity_notes: ['Keep it short.'],
        rewritten_example: payload.transcript,
        metrics: {
          word_count: 8,
          sentence_count: 1,
          filler_count: 0,
          avg_words_per_sentence: 8,
        },
      },
    }))
    const { result } = renderHook(() =>
      usePracticeSession({
        createCapture: () => capture,
        createId: () => 'hook-session',
        persistSession,
      }),
    )

    act(() => {
      result.current.configure({ mode: 'conversation', difficulty: 'warm_up' })
      result.current.begin()
    })
    expect(result.current.session.stage).toBe('studio')
    expect(result.current.session.id).toBe('hook-session')

    await act(async () => {
      await result.current.startListening()
    })
    expect(result.current.session.captureStatus).toBe('listening')

    act(() => {
      capture.listener?.({ type: 'final', text: 'Could you look at this with me?' })
      result.current.stopListening()
    })
    expect(result.current.session.captureStatus).toBe('stopped')
    expect(result.current.session.finalTranscript).toMatch(/look at this/i)

    await act(async () => {
      result.current.submit()
    })
    expect(result.current.session.stage).toBe('complete')
    expect(persistSession).toHaveBeenCalledTimes(1)
    expect(result.current.saveState.status).toBe('saved')
  })
})
