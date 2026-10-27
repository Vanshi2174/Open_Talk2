import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SessionComplete } from '../features/practice/components/SessionComplete'
import { SessionSetup } from '../features/practice/components/SessionSetup'
import { StudioSession } from '../features/practice/components/StudioSession'
import { isWebSpeechSupported } from '../features/practice/speech/support'
import { PRACTICE_MODES, type PracticeMode } from '../features/practice/types'
import { usePracticeSession } from '../features/practice/usePracticeSession'

function parseMode(value: string | null): PracticeMode | undefined {
  if (value && (PRACTICE_MODES as readonly string[]).includes(value)) {
    return value as PracticeMode
  }
  return undefined
}

export function PracticeStudioPage() {
  const [searchParams] = useSearchParams()
  const initialMode = useMemo(() => parseMode(searchParams.get('mode')), [searchParams])
  const practice = usePracticeSession({ initialMode })
  const { session, configure } = practice
  const speechSupported = isWebSpeechSupported()

  if (session.stage === 'setup') {
    return (
      <SessionSetup
        mode={session.mode}
        difficulty={session.difficulty}
        speechSupported={speechSupported}
        onModeChange={(mode) => configure({ mode })}
        onDifficultyChange={(difficulty) => configure({ difficulty })}
        onBegin={practice.begin}
      />
    )
  }

  if (session.stage === 'complete') {
    return (
      <SessionComplete
        session={session}
        saveState={practice.saveState}
        onNewSession={practice.backToSetup}
        onRetrySave={practice.retrySave}
      />
    )
  }

  return (
    <StudioSession
      session={session}
      onStart={() => {
        void practice.startListening()
      }}
      onStop={practice.stopListening}
      onRetry={practice.retry}
      onEdit={practice.editTranscript}
      onSubmit={practice.submit}
      onBack={practice.backToSetup}
    />
  )
}
