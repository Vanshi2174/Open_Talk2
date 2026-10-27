import { describe, expect, it } from 'vitest'
import { promptsFor, selectPrompt } from './prompts'
import { DIFFICULTIES, PRACTICE_MODES } from './types'

describe('practice prompts', () => {
  it('has at least one prompt for every mode and difficulty', () => {
    for (const mode of PRACTICE_MODES) {
      for (const difficulty of DIFFICULTIES) {
        expect(promptsFor(mode, difficulty).length).toBeGreaterThan(0)
      }
    }
  })

  it('selects from the requested pool', () => {
    const prompt = selectPrompt('public_speaking', 'stretch', () => 0)
    expect(prompt.mode).toBe('public_speaking')
    expect(prompt.difficulty).toBe('stretch')
  })
})
