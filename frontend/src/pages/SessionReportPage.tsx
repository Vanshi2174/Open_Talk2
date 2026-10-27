import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { CoachingReportView } from '../features/practice/components/CoachingReport'
import { difficultyLabel, modeLabel } from '../features/practice/prompts'
import { ApiError, getPracticeSession } from '../services/api'
import type { SavedPracticeSession } from '../types/sessions'

export function SessionReportPage() {
  const { sessionId } = useParams()
  const [session, setSession] = useState<SavedPracticeSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) {
      setError('That session could not be found.')
      setLoading(false)
      return
    }
    let ignore = false
    getPracticeSession(sessionId)
      .then((data) => {
        if (!ignore) setSession(data)
      })
      .catch((err) => {
        if (ignore) return
        const message =
          err instanceof ApiError ? err.message : 'Could not load this practice report.'
        setError(message)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-sm text-muted">Loading your report…</p>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="mx-auto w-full max-w-xl px-5 py-16 text-center sm:px-8">
        <h1 className="font-serif text-3xl">Report unavailable</h1>
        <p className="mt-2 text-muted">{error ?? 'That session could not be found.'}</p>
        <Button to="/dashboard" className="mt-6">
          Back to dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-12 sm:px-8">
      <div>
        <p className="text-sm font-medium tracking-wide text-primary">
          {modeLabel(session.mode)} · {difficultyLabel(session.difficulty)}
        </p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">{session.prompt.title}</h1>
        <p className="mt-2 text-muted">{session.prompt.text}</p>
      </div>

      <Card className="p-6">
        <h2 className="text-sm font-medium text-ink">Your transcript</h2>
        <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink">
          {session.transcript}
        </p>
      </Card>

      <CoachingReportView report={session.coaching} source={session.coaching_source} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button to="/practice" size="lg">
          Practice again
        </Button>
        <Button to="/dashboard" variant="outline" size="lg">
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}
