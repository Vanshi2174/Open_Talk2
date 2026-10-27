import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { TextField } from '../components/TextField'
import { useAuth, validateSignup, type FieldErrors } from '../features/auth'
import { ApiError } from '../services/api'

export function SignupPage() {
  const { isAuthenticated, register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Redirect if already logged in
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
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

    const nextErrors = validateSignup({ name, email, password, confirmPassword })
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      setSubmitting(true)
      await register({ name, email, password, confirmPassword })
      navigate('/dashboard', { replace: true })
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
      <h1 className="font-serif text-3xl tracking-tight">Create your space</h1>
      <p className="mt-2 text-muted">
        Sign up to save practice sessions and receive coaching on your transcripts.
      </p>

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
            name="name"
            autoComplete="name"
            label="Name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              clearFieldError('name')
              if (serverError) setServerError(null)
            }}
            error={errors.name}
          />
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
            autoComplete="new-password"
            label="Password"
            hint="At least 8 characters, with a letter and a number."
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
          <TextField
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              clearFieldError('confirmPassword')
              if (serverError) setServerError(null)
            }}
            error={errors.confirmPassword}
          />
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
