import { useState } from 'react'
import { AlertCircle, ArrowLeft, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ActiveTrainerRoom } from '../features/trainer/components/ActiveTrainerRoom'
import { TrainerReportView } from '../features/trainer/components/TrainerReportView'
import { TrainerSetup } from '../features/trainer/components/TrainerSetup'
import {
  type SessionConfig,
  useTrainerSession,
} from '../features/trainer/useTrainerSession'

export function TrainerPage() {
  const navigate = useNavigate()
  const [config, setConfig] = useState<SessionConfig | null>(null)
  const {
    status,
    isMuted,
    isCameraActive,
    audioLevel,
    turns,
    currentAiText,
    currentUserText,
    elapsedSeconds,
    errorMessage,
    visualCues,
    savedSession,
    videoRef,
    startSession,
    toggleMute,
    toggleCamera,
    endSession,
    reset,
  } = useTrainerSession()

  function handleStart(newConfig: SessionConfig) {
    setConfig(newConfig)
    startSession(newConfig)
  }

  function handleCancel() {
    reset()
    navigate('/dashboard')
  }

  // Error View
  if (status === 'error') {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="font-serif text-2xl text-ink">Live Session Notice</h2>
          <p className="text-sm leading-relaxed text-muted">
            {errorMessage || 'An error occurred with the live audio connection.'}
          </p>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <Button variant="outline" onClick={reset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
            <Button to="/dashboard" variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Completed Report View
  if (status === 'completed' && savedSession) {
    return <TrainerReportView session={savedSession} onPracticeAgain={reset} />
  }

  // Active Session View
  if (
    config &&
    (status === 'requesting_permissions' ||
      status === 'connecting' ||
      status === 'ready' ||
      status === 'listening' ||
      status === 'ai_speaking' ||
      status === 'ending')
  ) {
    return (
      <ActiveTrainerRoom
        config={config}
        status={status}
        isMuted={isMuted}
        isCameraActive={isCameraActive}
        audioLevel={audioLevel}
        turns={turns}
        currentAiText={currentAiText}
        currentUserText={currentUserText}
        elapsedSeconds={elapsedSeconds}
        visualCues={visualCues}
        videoRef={videoRef}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onEndSession={endSession}
      />
    )
  }

  // Default Setup View
  return <TrainerSetup onStart={handleStart} onCancel={handleCancel} />
}
