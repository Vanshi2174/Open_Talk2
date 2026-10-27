import { Link, Outlet, useNavigate } from 'react-router-dom'
import { ApiStatus } from '../components/ApiStatus'
import { Button } from '../components/Button'
import { Logo } from '../components/Logo'
import { useAuth } from '../features/auth'

export function PublicLayout() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Logo />
          <nav aria-label="Primary" className="flex items-center gap-2 sm:gap-3">
            <a
              href="/#features"
              className="hidden rounded-full px-3 py-2 text-sm text-muted hover:text-ink sm:inline-flex"
            >
              Features
            </a>

            {isAuthenticated && user ? (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-full px-3 py-2 text-sm font-medium text-ink hover:text-primary"
                >
                  Dashboard
                </Link>
                <Link
                  to="/trainer"
                  className="rounded-full px-3 py-2 text-sm font-medium text-ink hover:text-primary"
                >
                  Live Trainer
                </Link>
                <Link
                  to="/practice"
                  className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink hover:text-primary sm:inline-flex"
                >
                  Practice
                </Link>
                <span className="hidden text-sm text-muted sm:inline-block">
                  Hi, {user.name.split(' ')[0]}
                </span>
                <Button variant="ghost" size="md" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button to="/login" variant="ghost">
                  Log in
                </Button>
                <Button to="/signup" size="md">
                  Sign up
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-sm text-muted">Open Talk · Guided speaking practice</p>
          <ApiStatus />
        </div>
      </footer>
    </div>
  )
}
