import type { HealthResponse } from '../types/api'
import type {
  ApiErrorResponse,
  AuthResponse,
  CurrentUserResponse,
  User,
} from '../types/auth'
import type {
  PersistSessionPayload,
  SavedPracticeSession,
  SessionListResponse,
} from '../types/sessions'
import type {
  SaveTrainerSessionPayload,
  TrainerSession,
  TrainerSessionSummary,
  TrainerStatusResponse,
} from '../types/trainer'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

let cachedCsrfToken: string | null = null

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'))
  return match ? decodeURIComponent(match[3]) : null
}

export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export async function requestJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Double submit / header CSRF protection for mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    let token = cachedCsrfToken || getCookie('csrf_token')
    if (!token && !path.includes('/csrf-token')) {
      try {
        const csrfRes = await fetch(`${API_BASE}/api/auth/csrf-token`, {
          credentials: 'include',
        })
        if (csrfRes.ok) {
          const csrfData = (await csrfRes.json()) as { csrf_token?: string }
          if (csrfData?.csrf_token) {
            token = csrfData.csrf_token
            cachedCsrfToken = token
          }
        }
      } catch {
        // Continue even if fetching CSRF token fails
      }
    }
    if (token) {
      headers.set('X-CSRF-Token', token)
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  let payload: unknown = null
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    payload = await response.json()
  }

  if (payload && typeof payload === 'object' && 'csrf_token' in payload) {
    const token = (payload as { csrf_token?: string }).csrf_token
    if (token) {
      cachedCsrfToken = token
    }
  }

  if (!response.ok) {
    const errData = payload as ApiErrorResponse | null
    const message = errData?.message ?? `Request failed with status ${response.status}`
    throw new ApiError(message, response.status, errData?.field_errors)
  }

  return payload as T
}

export function getHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/api/health')
}

export async function getCsrfToken(): Promise<string> {
  const res = await requestJson<{ csrf_token: string }>('/api/auth/csrf-token')
  cachedCsrfToken = res.csrf_token
  return res.csrf_token
}

export async function getMe(): Promise<CurrentUserResponse> {
  try {
    return await requestJson<CurrentUserResponse>('/api/auth/me')
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { authenticated: false, user: null }
    }
    throw err
  }
}

export async function registerUser(payload: {
  name: string
  email: string
  password: string
  confirmPassword: string
}): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function loginUser(payload: {
  email: string
  password: string
}): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function logoutUser(): Promise<{ message: string }> {
  return requestJson<{ message: string }>('/api/auth/logout', {
    method: 'POST',
  })
}

export async function getUserProfile(userId: number): Promise<{ user: User }> {
  return requestJson<{ user: User }>(`/api/auth/users/${userId}/profile`)
}

export async function createPracticeSession(
  payload: PersistSessionPayload,
): Promise<SavedPracticeSession> {
  const res = await requestJson<{ session: SavedPracticeSession }>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.session
}

export async function listPracticeSessions(): Promise<SessionListResponse> {
  return requestJson<SessionListResponse>('/api/sessions')
}

export async function getPracticeSession(sessionId: string): Promise<SavedPracticeSession> {
  const res = await requestJson<{ session: SavedPracticeSession }>(`/api/sessions/${sessionId}`)
  return res.session
}

export async function getTrainerStatus(): Promise<TrainerStatusResponse> {
  return requestJson<TrainerStatusResponse>('/api/trainer/status')
}

export async function saveTrainerSession(
  payload: SaveTrainerSessionPayload,
): Promise<TrainerSession> {
  const res = await requestJson<{ session: TrainerSession }>('/api/trainer/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.session
}

export async function listTrainerSessions(): Promise<{ sessions: TrainerSessionSummary[]; total: number }> {
  return requestJson<{ sessions: TrainerSessionSummary[]; total: number }>('/api/trainer/sessions')
}

export async function getTrainerSession(sessionId: string): Promise<TrainerSession> {
  const res = await requestJson<{ session: TrainerSession }>(`/api/trainer/sessions/${sessionId}`)
  return res.session
}
