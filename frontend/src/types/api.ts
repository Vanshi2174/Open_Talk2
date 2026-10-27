export type HealthResponse = {
  status: string
  service: string
  phase: number
  version: string
}

export type HealthState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: HealthResponse }
  | { status: 'error'; message: string }
