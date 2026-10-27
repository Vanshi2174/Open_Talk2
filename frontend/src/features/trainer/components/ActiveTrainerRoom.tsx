import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  CameraOff,
  Clock,
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  User,
  Volume2,
} from 'lucide-react'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import type { SessionConfig, TrainerSessionStatus } from '../useTrainerSession'
import type { TrainerTurn, VisualObservations } from '../../../types/trainer'

interface ActiveTrainerRoomProps {
  config: SessionConfig
  status: TrainerSessionStatus
  isMuted: boolean
  isCameraActive: boolean
  audioLevel: number
  turns: TrainerTurn[]
  currentAiText: string
  currentUserText: string
  elapsedSeconds: number
  visualCues: VisualObservations
  videoRef: React.RefObject<HTMLVideoElement | null>
  onToggleMute: () => void
  onToggleCamera: () => void
  onEndSession: () => void
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export function ActiveTrainerRoom({
  config,
  status,
  isMuted,
  isCameraActive,
  audioLevel,
  turns,
  currentAiText,
  currentUserText,
  elapsedSeconds,
  visualCues,
  videoRef,
  onToggleMute,
  onToggleCamera,
  onEndSession,
}: ActiveTrainerRoomProps) {
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)
  const [showConfirmEnd, setShowConfirmEnd] = useState(false)

  // Auto-scroll transcript on new turns
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, currentAiText, currentUserText])

  const targetSecs = config.targetDurationMinutes * 60
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / targetSecs) * 100))

  return (
    <div className="mx-auto flex h-full min-h-[calc(100svh-120px)] w-full max-w-6xl flex-col justify-between gap-6 px-4 py-6 sm:px-6">
      {/* Top Session Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-soft text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-medium text-ink capitalize">
                {config.mode.replace('_', ' ')}
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 capitalize">
                {config.difficulty}
              </span>
              <span className="rounded-full bg-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                {config.language}
              </span>
            </div>
            <p className="text-xs text-muted">Alex · AI Communication Coach</p>
          </div>
        </div>

        {/* Elapsed Timer & Target Duration */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 shadow-xs">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm font-semibold text-ink">
              {formatDuration(elapsedSeconds)}
            </span>
            <span className="text-xs text-muted">/ {config.targetDurationMinutes}m</span>
          </div>

          <Button
            variant="danger"
            size="md"
            onClick={() => setShowConfirmEnd(true)}
            className="gap-2 rounded-full"
          >
            <PhoneOff className="h-4 w-4" />
            End Session
          </Button>
        </div>
      </div>

      {/* Main Experience Grid: AI Stage & Camera Preview vs Live Transcript */}
      <div className="grid flex-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left Column: AI Presence Stage & Video Window */}
        <div className="flex flex-col gap-4">
          <Card className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-8 text-center sm:p-12">
            {/* Visual State Waves & Pulsing Indicator */}
            <div className="relative mb-6 flex h-40 w-40 items-center justify-center">
              {/* Outer Glow Ring */}
              <div
                className={`absolute inset-0 rounded-full transition-all duration-700 ${
                  status === 'ai_speaking'
                    ? 'scale-125 bg-primary/20 animate-pulse'
                    : status === 'listening'
                      ? 'scale-110 bg-soft/70'
                      : 'scale-100 bg-slate-100'
                }`}
              />
              {/* Middle Dynamic Wave */}
              <div
                className={`absolute inset-3 rounded-full transition-all duration-500 ${
                  status === 'ai_speaking'
                    ? 'bg-primary/40 animate-ping'
                    : status === 'listening'
                      ? 'bg-soft'
                      : 'bg-slate-200'
                }`}
                style={{ animationDuration: '2s' }}
              />
              {/* Core Avatar Orb */}
              <div
                className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition-transform duration-300 ${
                  status === 'ai_speaking'
                    ? 'bg-primary scale-110 shadow-primary/30'
                    : status === 'listening'
                      ? 'bg-primary/90 scale-100'
                      : 'bg-slate-400'
                }`}
              >
                {status === 'ai_speaking' ? (
                  <Volume2 className="h-10 w-10 animate-bounce" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
              </div>
            </div>

            {/* Status Description */}
            <h3 className="font-serif text-2xl text-ink">Alex</h3>
            <p className="mt-1 text-sm font-medium text-primary">
              {status === 'connecting'
                ? 'Connecting to real-time audio…'
                : status === 'ai_speaking'
                  ? 'Speaking…'
                  : status === 'listening'
                    ? isMuted
                      ? 'Microphone is muted'
                      : 'Listening attentively to you…'
                    : status === 'ending'
                      ? 'Compiling coaching analysis…'
                      : 'Coaching active'}
            </p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted">
              Speak naturally. You can pause, explain in detail, or interrupt Alex at any point to
              ask or clarify.
            </p>

            {/* Live Audio Level Meter when listening */}
            {status === 'listening' && !isMuted && (
              <div className="mt-4 flex items-center gap-1.5">
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((step, idx) => (
                  <span
                    key={idx}
                    className={`h-4 w-1.5 rounded-full transition-all duration-100 ${
                      audioLevel >= step ? 'bg-primary h-6' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Optional Picture-in-Picture Camera Preview */}
          {isCameraActive && (
            <Card className="relative overflow-hidden p-3 bg-slate-900 text-white">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover -scale-x-100"
                />
                {/* Visual Coaching Observation Badge */}
                <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                    {visualCues.posture || 'Posture: Centered & upright'}
                  </span>
                  <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-blue-200">
                    {visualCues.orientation || 'Looking at camera'}
                  </span>
                  <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-slate-200">
                    {visualCues.gestures || 'Natural gestures'}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Live Conversation Transcript */}
        <Card className="flex flex-col justify-between overflow-hidden">
          <div className="border-b border-line px-5 py-3.5 bg-canvas/40 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Live Transcript
            </h3>
            <span className="text-xs text-muted">
              {turns.length} exchange{turns.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Scrollable Conversation Stream */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5 max-h-[460px]">
            {turns.length === 0 && !currentAiText && !currentUserText && (
              <div className="flex h-40 flex-col items-center justify-center text-center text-muted">
                <p className="text-sm">Alex will greet you in a moment.</p>
                <p className="mt-1 text-xs">Your spoken conversation will appear here live.</p>
              </div>
            )}

            {turns.map((turn, index) => {
              const isUser = turn.role === 'user'
              return (
                <div
                  key={index}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-soft text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-primary text-white rounded-tr-xs'
                        : 'bg-canvas border border-line text-ink rounded-tl-xs'
                    }`}
                  >
                    <p>{turn.text}</p>
                  </div>

                  {isUser && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Ongoing partial user speech */}
            {currentUserText && (
              <div className="flex justify-end gap-3">
                <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-primary/70 px-4 py-3 text-sm text-white italic">
                  <p>{currentUserText}…</p>
                </div>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                  <User className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* Ongoing partial AI text */}
            {currentAiText && (
              <div className="flex justify-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-soft text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-xs border border-line bg-canvas px-4 py-3 text-sm text-ink leading-relaxed">
                  <p>{currentAiText}…</p>
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* Bottom Progress Bar */}
          <div className="border-t border-line p-3 bg-canvas/20">
            <div className="flex items-center justify-between text-xs text-muted mb-1.5">
              <span>Session Target Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="flex items-center justify-center gap-4 rounded-3xl border border-line bg-surface/90 backdrop-blur-md px-6 py-4 shadow-sm">
        {/* Mute Button */}
        <Button
          variant={isMuted ? 'danger' : 'outline'}
          size="lg"
          onClick={onToggleMute}
          className="gap-2 rounded-full px-5"
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {isMuted ? 'Unmute Mic' : 'Mute Mic'}
        </Button>

        {/* Camera Toggle Button */}
        <Button
          variant={isCameraActive ? 'primary' : 'outline'}
          size="lg"
          onClick={onToggleCamera}
          className="gap-2 rounded-full px-5"
        >
          {isCameraActive ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
          {isCameraActive ? 'Camera On' : 'Turn On Camera'}
        </Button>

        {/* End Call Button */}
        <Button
          variant="danger"
          size="lg"
          onClick={() => setShowConfirmEnd(true)}
          className="gap-2 rounded-full px-5"
        >
          <PhoneOff className="h-4 w-4" />
          End Session & Review
        </Button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <Card className="max-w-md p-6 text-center shadow-xl">
            <h3 className="font-serif text-2xl text-ink">Ready to complete this session?</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Ending will stop all audio and camera streams, analyze your speech delivery, and
              generate your personalised coaching report.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="ghost" onClick={() => setShowConfirmEnd(false)}>
                Continue Practice
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowConfirmEnd(false)
                  onEndSession()
                }}
              >
                Yes, Generate Report
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
