import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './features/auth'
import { PublicLayout } from './layouts/PublicLayout'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { PracticeStudioPage } from './pages/PracticeStudioPage'
import { SessionReportPage } from './pages/SessionReportPage'
import { SignupPage } from './pages/SignupPage'
import { TrainerPage } from './pages/TrainerPage'
import { TrainerReportPage } from './pages/TrainerReportPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="trainer"
              element={
                <ProtectedRoute>
                  <TrainerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="trainer/sessions/:sessionId"
              element={
                <ProtectedRoute>
                  <TrainerReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="practice"
              element={
                <ProtectedRoute>
                  <PracticeStudioPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="practice/sessions/:sessionId"
              element={
                <ProtectedRoute>
                  <SessionReportPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
