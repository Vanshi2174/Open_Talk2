import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { TextField } from '../components/TextField'
import { useAuth, validateLogin, type FieldErrors } from '../features/auth'
import { ApiError } from '../services/api'

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Redirect if already logged in
  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'
    return <Navigate to={from} replace />
  }

  function clearFieldError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(null)

    const nextErrors = validateLogin({ email, password })
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      setSubmitting(true)
      await login({ email, password })
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message)
        if (err.fieldErrors) {
          setErrors((prev) => ({ ...prev, ...err.fieldErrors }))
        }
      } else {
        setServerError('Unable to connect to server. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-5 py-14 sm:px-8">
      <h1 className="font-serif text-3xl tracking-tight">Welcome back</h1>
      <p className="mt-2 text-muted">Log in to continue your speaking practice.</p>

      <Card className="mt-8 p-6 sm:p-8">
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {serverError ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              {serverError}
            </div>
          ) : null}

          <TextField
            name="email"
            type="email"
            autoComplete="email"
            label="Email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              clearFieldError('email')
              if (serverError) setServerError(null)
            }}
            error={errors.email}
          />
          <TextField
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            label="Password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              clearFieldError('password')
              if (serverError) setServerError(null)
            }}
            error={errors.password}
            trailing={
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:text-ink"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-sm text-muted">
        New here?{' '}
        <Link to="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
