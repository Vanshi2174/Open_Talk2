import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Mic, Sparkles, User as UserIcon, Zap } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useAuth } from '../features/auth'
import { difficultyLabel, modeLabel } from '../features/practice/prompts'
import { PRACTICE_MODES } from '../features/practice/types'
import { listPracticeSessions, listTrainerSessions } from '../services/api'
import type { SessionListResponse } from '../types/sessions'
import type { TrainerSessionSummary } from '../types/trainer'

function formatWhen(value: string | null) {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function DashboardPage() {
  const { user, loading } = useAuth()
  const [history, setHistory] = useState<SessionListResponse | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [trainerSessions, setTrainerSessions] = useState<TrainerSessionSummary[]>([])

  useEffect(() => {
    if (!user) return
    let ignore = false
    listPracticeSessions()
      .then((data) => {
        if (!ignore) setHistory(data)
      })
      .catch(() => {
        if (!ignore) setHistoryError('Practice history could not be loaded.')
      })

    listTrainerSessions()
      .then((data) => {
        if (!ignore) setTrainerSessions(data.sessions.slice(0, 3))
      })
      .catch(() => {})

    return () => {
      ignore = true
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-sm text-muted">Loading your workspace…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-xl px-5 py-16 text-center sm:px-8">
        <h1 className="font-serif text-3xl">Sign in to continue</h1>
        <p className="mt-2 text-muted">Your practice workspace is available after you log in.</p>
        <Button to="/login" className="mt-6">
          Log in
        </Button>
      </div>
    )
  }

  const stats = history?.stats
  const sessions = history?.sessions ?? []

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-12 sm:px-8">
      <div>
        <p className="text-sm font-medium tracking-wide text-primary">Workspace</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">
          Welcome back, {user.name}
        </h1>
        <p className="mt-2 text-muted">
          Practice a prompt, then review saved coaching notes from your transcript.
        </p>
      </div>

      {/* Live AI Trainer Hero CTA */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-soft via-surface to-white p-6 sm:p-8">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
              <Zap className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-2xl text-ink">Live AI Trainer</h2>
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  NEW
                </span>
              </div>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                Speak naturally with your real-time AI coach Alex. Practice mock interviews,
                public speaking, or everyday conversation with bidirectional voice AI, live transcript,
                and optional camera coaching.
              </p>
              {trainerSessions.length > 0 && (
                <p className="mt-2 text-xs text-primary font-medium">
                  {trainerSessions.length} live session{trainerSessions.length > 1 ? 's' : ''} completed
                </p>
              )}
            </div>
          </div>
          <Button to="/trainer" size="lg" className="shrink-0 gap-2">
            Open Trainer
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </Card>

      {/* Recent Live Trainer Sessions */}
      {trainerSessions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-ink">Recent Live Sessions</h2>
            <Link to="/trainer" className="text-xs font-medium text-primary hover:underline">
              Start new session
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            {trainerSessions.map((ts) => (
              <li key={ts.id}>
                <Card className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted capitalize">
                    {ts.mode.replace('_', ' ')} · {ts.difficulty}
                  </p>
                  <p className="mt-2 text-sm font-medium text-ink">
                    {ts.summary
                      ? ts.summary.slice(0, 90) + (ts.summary.length > 90 ? '…' : '')
                      : 'Live coaching session'}
                  </p>
                  {ts.overall_score !== undefined && (
                    <p className="mt-1.5 text-xs font-semibold text-primary">
                      Score: {ts.overall_score}/100
                    </p>
                  )}
                  <Link
                    to={`/trainer/sessions/${ts.id}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-primary"
                  >
                    View report
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-soft text-primary">
            <Mic className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-serif text-2xl">Practice Studio</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              Mock interviews, public speaking, and everyday conversation with live transcription
              where your browser supports it.
            </p>
          </div>
        </div>
        <Button to="/practice" size="lg">
          Open studio
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </Card>

      <div>
        <h2 className="text-sm font-medium text-ink">Jump into a mode</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {PRACTICE_MODES.map((mode) => (
            <Card key={mode} className="flex flex-col gap-3 p-5">
              <h3 className="font-serif text-lg">{modeLabel(mode)}</h3>
              <p className="text-sm text-muted">
                {stats ? `${stats.by_mode[mode]} saved` : '—'}
              </p>
              <Button to={`/practice?mode=${mode}`} variant="outline" className="mt-auto">
                Start
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft text-primary">
            <UserIcon className="h-5 w-5" />
          </div>
          <h2 className="font-serif text-lg font-medium">Account</h2>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="text-sm text-muted">
            {stats?.total
              ? `${stats.total} saved session${stats.total === 1 ? '' : 's'}`
              : 'No saved sessions yet'}
          </p>
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="font-serif text-lg font-medium">Coaching</h2>
          <p className="text-sm text-muted">
            Reports are generated from your transcript. Add a Gemini API key on the server for
            model-written notes; otherwise a local review is stored.
          </p>
        </Card>
      </div>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="font-serif text-2xl">
          Practice history
        </h2>
        {historyError ? (
          <Card className="mt-4 p-8 text-center">
            <p className="text-sm text-muted">{historyError}</p>
          </Card>
        ) : sessions.length === 0 ? (
          <Card className="mt-4 p-8 text-center">
            <p className="font-medium text-ink">No saved sessions yet</p>
            <p className="mt-2 text-sm text-muted">
              Finish a studio session and your transcript plus coaching will show up here.
            </p>
            <Button to="/practice" variant="secondary" className="mt-5">
              Start a session
            </Button>
          </Card>
        ) : (
          <ul className="mt-4 grid gap-4">
            {sessions.map((item) => (
              <li key={item.id}>
                <Card className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                        {modeLabel(item.mode)} · {difficultyLabel(item.difficulty)} ·{' '}
                        {formatWhen(item.submitted_at ?? item.created_at)}
                      </p>
                      <h3 className="mt-2 font-serif text-xl text-ink">{item.prompt_title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {item.summary || 'Open this report to read your coaching notes.'}
                      </p>
                    </div>
                    <Link
                      to={`/practice/sessions/${item.id}`}
                      className="inline-flex shrink-0 items-center justify-center rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-primary hover:text-primary"
                    >
                      View report
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
