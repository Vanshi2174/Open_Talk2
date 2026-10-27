import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import type { SaveState } from '../../../types/sessions'
import { difficultyLabel, modeLabel } from '../prompts'
import type { PracticeSession } from '../types'
import { CoachingReportView } from './CoachingReport'

type SessionCompleteProps = {
  session: PracticeSession
  saveState: SaveState
  onNewSession: () => void
  onRetrySave: () => void
}

export function SessionComplete({
  session,
  saveState,
  onNewSession,
  onRetrySave,
}: SessionCompleteProps) {
  const prompt = session.prompt
  const transcript = session.editedTranscript.trim() || session.finalTranscript.trim()
  const saved = saveState.status === 'saved' ? saveState.session : null

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-12 sm:px-8">
      <div>
        <p className="text-sm font-medium tracking-wide text-primary">Session complete</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">Your practice report</h1>
        <p className="mt-2 text-muted">
          The transcript is saved to your history. Coaching is written from the words you
          submitted — not from invented pitch or pronunciation scores.
        </p>
      </div>

      {prompt ? (
        <Card className="p-6">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            {modeLabel(prompt.mode)} · {difficultyLabel(prompt.difficulty)}
          </p>
          <h2 className="mt-2 font-serif text-xl text-ink">{prompt.text}</h2>
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-sm font-medium text-ink">Your transcript</h2>
        {transcript ? (
          <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink">
            {transcript}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">No transcript was kept for this session.</p>
        )}
      </Card>

      {saveState.status === 'saving' ? (
        <Card className="p-6">
          <p className="text-sm text-muted">Saving your session and writing coaching notes…</p>
        </Card>
      ) : null}

      {saveState.status === 'error' ? (
        <Card className="p-6">
          <p className="font-medium text-danger">Could not save this session</p>
          <p className="mt-2 text-sm text-muted">{saveState.message}</p>
          <Button className="mt-4" variant="secondary" onClick={onRetrySave}>
            Try saving again
          </Button>
        </Card>
      ) : null}

      {saved ? <CoachingReportView report={saved.coaching} source={saved.coaching_source} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={onNewSession}>
          New practice session
        </Button>
        <Button to="/dashboard" variant="outline" size="lg">
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}
