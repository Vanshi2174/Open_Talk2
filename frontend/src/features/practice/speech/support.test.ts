import { describe, expect, it } from 'vitest'
import { isWebSpeechSupported, mapRecognitionError } from './support'

describe('speech support', () => {
  it('treats jsdom as unsupported without speech recognition', () => {
    expect(isWebSpeechSupported()).toBe(false)
  })

  it('maps browser recognition errors', () => {
    expect(mapRecognitionError('not-allowed').fatal).toBe(true)
    expect(mapRecognitionError('no-speech').fatal).toBe(false)
    expect(mapRecognitionError('aborted').message).toBe('')
    expect(mapRecognitionError('network').message).toMatch(/network/i)
  })
})
