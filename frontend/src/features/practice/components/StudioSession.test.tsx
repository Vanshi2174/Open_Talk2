import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PRACTICE_PROMPTS } from '../prompts'
import { createInitialSession, reducePracticeSession } from '../sessionMachine'
import { StudioSession } from './StudioSession'

const prompt = PRACTICE_PROMPTS.find((item) => item.mode === 'interview') ?? PRACTICE_PROMPTS[0]

function renderStudio(overrides: Parameters<typeof reducePracticeSession>[1][] = []) {
  let session = reducePracticeSession(createInitialSession(), {
    type: 'begin',
    id: 's1',
    prompt,
  })
  for (const event of overrides) {
    session = reducePracticeSession(session, event)
  }

  const onStart = vi.fn()
  const onStop = vi.fn()
  const onRetry = vi.fn()
  const onEdit = vi.fn()
  const onSubmit = vi.fn()
  const onBack = vi.fn()

  render(
    <MemoryRouter>
      <StudioSession
        session={session}
        onStart={onStart}
        onStop={onStop}
        onRetry={onRetry}
        onEdit={onEdit}
        onSubmit={onSubmit}
        onBack={onBack}
      />
    </MemoryRouter>,
  )

  return { onStart, onStop, onRetry, onEdit, onSubmit, onBack }
}

describe('StudioSession', () => {
  it('disables submit for an empty transcript', () => {
    renderStudio()
    expect(screen.getByRole('button', { name: 'Submit transcript' })).toBeDisabled()
    expect(screen.getByText(/nothing to submit yet/i)).toBeInTheDocument()
  })

  it('shows listening state and stop control', async () => {
    const user = userEvent.setup()
    const { onStop } = renderStudio([{ type: 'capture_listening' }])
    expect(screen.getByText('Listening')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Stop' }))
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('allows submit after a transcript is present', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderStudio([
      { type: 'append_final', text: 'I asked to walk through the risks together.' },
      { type: 'stop' },
    ])
    const submit = screen.getByRole('button', { name: 'Submit transcript' })
    expect(submit).toBeEnabled()
    await user.click(submit)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('explains unsupported browsers and microphone denial', () => {
    const { unmount } = render(
      <MemoryRouter>
        <StudioSession
          session={reducePracticeSession(
            reducePracticeSession(createInitialSession(), { type: 'begin', id: 's1', prompt }),
            { type: 'capture_unsupported' },
          )}
          onStart={vi.fn()}
          onStop={vi.fn()}
          onRetry={vi.fn()}
          onEdit={vi.fn()}
          onSubmit={vi.fn()}
          onBack={vi.fn()}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText(/speech recognition unavailable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start listening' })).toBeDisabled()
    unmount()

    render(
      <MemoryRouter>
        <StudioSession
          session={reducePracticeSession(
            reducePracticeSession(createInitialSession(), { type: 'begin', id: 's1', prompt }),
            { type: 'permission_denied' },
          )}
          onStart={vi.fn()}
          onStop={vi.fn()}
          onRetry={vi.fn()}
          onEdit={vi.fn()}
          onSubmit={vi.fn()}
          onBack={vi.fn()}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Try microphone again' })).toBeEnabled()
  })
})
