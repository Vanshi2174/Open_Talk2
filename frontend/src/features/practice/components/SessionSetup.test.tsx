import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SessionSetup } from './SessionSetup'

describe('SessionSetup', () => {
  it('lets the user choose a mode, difficulty, and start', async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()
    const onDifficultyChange = vi.fn()
    const onBegin = vi.fn()

    render(
      <SessionSetup
        mode="interview"
        difficulty="standard"
        speechSupported
        onModeChange={onModeChange}
        onDifficultyChange={onDifficultyChange}
        onBegin={onBegin}
      />,
    )

    await user.click(screen.getByRole('button', { name: /public speaking/i }))
    expect(onModeChange).toHaveBeenCalledWith('public_speaking')

    await user.click(screen.getByRole('button', { name: /stretch/i }))
    expect(onDifficultyChange).toHaveBeenCalledWith('stretch')

    await user.click(screen.getByRole('button', { name: 'Start practice' }))
    expect(onBegin).toHaveBeenCalledTimes(1)
  })
})
