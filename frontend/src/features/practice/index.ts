export { createSpeechCapture } from './speech/createSpeechCapture'
export { isWebSpeechSupported } from './speech/support'
export type { SpeechCapture } from './speech/types'
export { difficultyLabel, modeLabel, selectPrompt } from './prompts'
export {
  canSubmitTranscript,
  displayTranscript,
  PRACTICE_MODES,
  DIFFICULTIES,
} from './types'
export type { Difficulty, PracticeMode, PracticeSession } from './types'
export { usePracticeSession } from './usePracticeSession'
