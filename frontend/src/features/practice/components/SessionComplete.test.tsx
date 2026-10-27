import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PRACTICE_PROMPTS } from '../prompts'
import { createInitialSession, reducePracticeSession } from '../sessionMachine'
import { SessionComplete } from './SessionComplete'

const prompt = PRACTICE_PROMPTS[0]

function completedSession() {
  let session = reducePracticeSession(createInitialSession(), {
    type: 'begin',
    id: 's1',
    prompt,
  })
  session = reducePracticeSession(session, { type: 'append_final', text: 'I asked to walk through the risks.' })
  session = reducePracticeSession(session, { type: 'stop' })
  return reducePracticeSession(session, {
    type: 'submit',
    submittedAt: '2026-10-27T12:00:00.000Z',
  })
}

describe('SessionComplete', () => {
  it('shows a saved coaching report', () => {
    render(
      <MemoryRouter>
        <SessionComplete
          session={completedSession()}
          saveState={{
            status: 'saved',
            session: {
              id: 's1',
              mode: 'interview',
              difficulty: 'warm_up',
              prompt: { id: prompt.id, title: prompt.title, text: prompt.text },
              transcript: 'I asked to walk through the risks.',
              started_at: null,
              stopped_at: null,
              submitted_at: '2026-10-27T12:00:00.000Z',
              created_at: '2026-10-27T12:00:00.000Z',
              coaching_source: 'local',
              coaching: {
                summary: 'Local transcript review for this answer.',
                strengths: ['You named a specific action.'],
                improvements: ['Add the result.'],
                grammar_notes: ['Looks complete.'],
                clarity_notes: ['Keep one idea per sentence.'],
                rewritten_example: 'I asked to walk through the risks together.',
                metrics: {
                  word_count: 8,
                  sentence_count: 1,
                  filler_count: 0,
                  avg_words_per_sentence: 8,
                },
              },
            },
          }}
          onNewSession={vi.fn()}
          onRetrySave={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/your practice report/i)).toBeInTheDocument()
    expect(screen.getByText(/you named a specific action/i)).toBeInTheDocument()
    expect(screen.getByText('Local transcript review')).toBeInTheDocument()
  })
})
