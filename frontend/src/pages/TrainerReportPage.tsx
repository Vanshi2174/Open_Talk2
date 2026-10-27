import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { TrainerReportView } from '../features/trainer/components/TrainerReportView'
import { getTrainerSession } from '../services/api'
import type { TrainerSession } from '../types/trainer'

export function TrainerReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<TrainerSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let ignore = false
    getTrainerSession(sessionId)
      .then((data) => {
        if (!ignore) {
          setSession(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Report not found.')
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-sm text-muted">Loading your coaching report…</p>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <h2 className="font-serif text-2xl text-ink">Session Not Found</h2>
          <p className="text-sm text-muted">
            {error || 'This live trainer report could not be found or you do not have permission to view it.'}
          </p>
          <Button to="/dashboard" variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Return to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return <TrainerReportView session={session} />
}
