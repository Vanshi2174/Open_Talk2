import { Mic, RotateCcw, Square } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { difficultyLabel, modeLabel } from '../prompts'
import {
  canSubmitTranscript,
  displayTranscript,
  type PracticeSession,
} from '../types'

const STATUS_COPY: Record<
  PracticeSession['captureStatus'],
  { label: string; detail: string }
> = {
  idle: {
    label: 'Ready',
    detail: 'Start listening when you want to speak, or type your answer below.',
  },
  requesting: {
    label: 'Asking for microphone',
    detail: 'Your browser should prompt for microphone access.',
  },
  listening: {
    label: 'Listening',
    detail: 'Speak naturally. You can stop whenever you are done.',
  },
  stopped: {
    label: 'Review',
    detail: 'Edit the transcript if needed, then submit or retry.',
  },
  unsupported: {
    label: 'Speech recognition unavailable',
    detail: 'This browser cannot transcribe speech. Type your answer instead.',
  },
  permission_denied: {
    label: 'Microphone blocked',
    detail: 'Allow the microphone and try again, or type your answer.',
  },
  error: {
    label: 'Recognition error',
    detail: 'You can retry listening or type the answer yourself.',
  },
}

type StudioSessionProps = {
  session: PracticeSession
  onStart: () => void
  onStop: () => void
  onRetry: () => void
  onEdit: (text: string) => void
  onSubmit: () => void
  onBack: () => void
}

export function StudioSession({
  session,
  onStart,
  onStop,
  onRetry,
  onEdit,
  onSubmit,
  onBack,
}: StudioSessionProps) {
  const prompt = session.prompt
  const status = STATUS_COPY[session.captureStatus]
  const listening = session.captureStatus === 'listening' || session.captureStatus === 'requesting'
  const canListen =
    session.captureStatus !== 'unsupported' &&
    session.captureStatus !== 'listening' &&
    session.captureStatus !== 'requesting'
  const transcript = displayTranscript(session)
  const empty = transcript.trim().length === 0
  const editable = !listening

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-10 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-primary">
            {prompt ? `${modeLabel(prompt.mode)} · ${difficultyLabel(prompt.difficulty)}` : 'Practice'}
          </p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight">Your prompt</h1>
        </div>
        <Button variant="ghost" onClick={onBack}>
          Change setup
        </Button>
      </div>

      {prompt ? (
        <Card className="p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            {prompt.title}
          </p>
          <h2 className="mt-2 font-serif text-2xl leading-snug text-ink">{prompt.text}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{prompt.guidance}</p>
        </Card>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className={[
                'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white',
                session.captureStatus === 'listening' ? 'bg-primary mic-listening' : 'bg-primary',
              ].join(' ')}
              aria-hidden="true"
            >
              <Mic className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium text-ink" aria-live="polite">
                {status.label}
              </p>
              <p className="text-sm text-muted">{session.captureError ?? status.detail}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {listening ? (
              <Button variant="outline" onClick={onStop}>
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
                Stop
              </Button>
            ) : (
              <Button onClick={onStart} disabled={!canListen}>
                <Mic className="h-4 w-4" aria-hidden="true" />
                {session.captureStatus === 'permission_denied' ? 'Try microphone again' : 'Start listening'}
              </Button>
            )}
            <Button variant="secondary" onClick={onRetry} disabled={listening}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </div>
        </div>
      </Card>

      <div>
        <label htmlFor="practice-transcript" className="mb-1.5 block text-sm font-medium text-ink">
          Transcript
        </label>
        <textarea
          id="practice-transcript"
          value={transcript}
          readOnly={!editable}
          onChange={(event) => onEdit(event.target.value)}
          placeholder={
            listening
              ? 'Listening… your words will appear here.'
              : 'Your spoken words appear here. You can edit them before submitting.'
          }
          className="min-h-48 w-full rounded-[1.25rem] border border-line bg-surface px-4 py-3 text-[0.95rem] leading-relaxed text-ink placeholder:text-muted/80"
          aria-describedby="transcript-help"
        />
        <p id="transcript-help" className="mt-2 text-sm text-muted">
          {empty
            ? 'Nothing to submit yet. Speak, or type a few sentences.'
            : listening
              ? 'Listening is in progress. Stop before editing or submitting.'
              : 'Review this text, then submit to save it and receive coaching notes.'}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={!canSubmitTranscript(session)}
        >
          Submit transcript
        </Button>
      </div>
    </div>
  )
}
