import { useHealth } from '../hooks/useHealth'

export function ApiStatus() {
  const health = useHealth()

  if (health.status === 'loading' || health.status === 'idle') {
    return (
      <p className="text-sm text-muted" aria-live="polite">
        Checking API…
      </p>
    )
  }

  if (health.status === 'ok') {
    return (
      <p className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
        <span className="inline-block h-2 w-2 rounded-full bg-success" aria-hidden="true" />
        API connected · {health.data.service} · Phase {health.data.phase}
      </p>
    )
  }

  return (
    <p className="flex items-center gap-2 text-sm text-danger" role="status">
      <span className="inline-block h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
      {health.message}
    </p>
  )
}
