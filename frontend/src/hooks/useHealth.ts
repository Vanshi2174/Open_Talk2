import { useEffect, useState } from 'react'
import { getHealth } from '../services/api'
import type { HealthState } from '../types/api'

export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    getHealth()
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'ok', data })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: 'API is unreachable. Start the Flask server on port 5000.',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
