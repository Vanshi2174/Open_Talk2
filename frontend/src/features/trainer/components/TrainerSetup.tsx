import { useEffect, useState } from 'react'
import {
  Briefcase,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  Globe,
  Mic,
  MessageSquare,
  Sparkles,
  Volume2,
} from 'lucide-react'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { getTrainerStatus } from '../../../services/api'
import type {
  TrainerDifficulty,
  TrainerLanguage,
  TrainerMode,
  TrainerStatusResponse,
} from '../../../types/trainer'
import type { SessionConfig } from '../useTrainerSession'

interface TrainerSetupProps {
  onStart: (config: SessionConfig) => void
  onCancel: () => void
}

const MODES: Array<{
  id: TrainerMode
  title: string
  desc: string
  icon: typeof Briefcase
}> = [
  {
    id: 'interview',
    title: 'Mock Job Interview',
    desc: 'Practice behavioral, situational, and technical interview questions with realistic follow-ups.',
    icon: Briefcase,
  },
  {
    id: 'public_speaking',
    title: 'Public Speaking',
    desc: 'Master opening hooks, presentation cadence, storytelling, and structured explanations.',
    icon: Volume2,
  },
  {
    id: 'conversation',
    title: 'Everyday Conversation',
    desc: 'Develop smooth conversational flow, active listening, and spontaneous storytelling.',
    icon: MessageSquare,
  },
  {
    id: 'confidence',
    title: 'Confidence Practice',
    desc: 'Overcome hesitation, speak with vocal presence, and communicate ideas comfortably.',
    icon: Sparkles,
  },
  {
    id: 'custom',
    title: 'Custom Practice',
    desc: 'Specify your own topic, scenario, or presentation to practice with tailored coaching.',
    icon: Compass,
  },
]

const DIFFICULTIES: Array<{ id: TrainerDifficulty; label: string; desc: string }> = [
  { id: 'beginner', label: 'Beginner', desc: 'Gentle pacing with supportive guidance and hints' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Natural pacing with standard follow-up questions' },
  { id: 'advanced', label: 'Advanced', desc: 'Fast-paced, challenging questions and deep dives' },
]

const LANGUAGES: TrainerLanguage[] = ['English', 'Hindi', 'Hinglish']
const DURATIONS = [3, 5, 10, 15]

export function TrainerSetup({ onStart, onCancel }: TrainerSetupProps) {
  const [mode, setMode] = useState<TrainerMode>('interview')
  const [difficulty, setDifficulty] = useState<TrainerDifficulty>('intermediate')
  const [language, setLanguage] = useState<TrainerLanguage>('English')
  const [duration, setDuration] = useState<number>(5)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [customTopic, setCustomTopic] = useState('')
  const [statusInfo, setStatusInfo] = useState<TrainerStatusResponse | null>(null)
  const [micChecked, setMicChecked] = useState(false)
  const [micTesting, setMicTesting] = useState(false)

  useEffect(() => {
    getTrainerStatus()
      .then(setStatusInfo)
      .catch(() => {})
  }, [])

  async function testMicrophone() {
    setMicTesting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setMicChecked(true)
    } catch {
      alert('Microphone permission was denied. Please allow microphone access in your browser settings.')
    } finally {
      setMicTesting(false)
    }
  }

  function handleStart() {
    onStart({
      mode,
      difficulty,
      language,
      customTopic: mode === 'custom' ? customTopic : undefined,
      targetDurationMinutes: duration,
      cameraEnabled,
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Live AI Communication Trainer
          </span>
          {statusInfo?.gemini_configured ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              Live API Ready
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              API key optional for local mode
            </span>
          )}
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Configure Your Coaching Room
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Choose your practice mode, language, and session preferences. Once started, you will speak
          in real-time with Alex, your personal communication coach.
        </p>
      </div>

      {/* Practice Mode */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-ink">1. Select Practice Mode</label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((m) => {
            const Icon = m.icon
            const isSelected = mode === m.id
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex flex-col items-start gap-2.5 rounded-2xl border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-soft/50 shadow-sm ring-1 ring-primary'
                    : 'border-line bg-surface hover:border-primary/40'
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isSelected ? 'bg-primary text-white' : 'bg-soft text-primary'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-ink">{m.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{m.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom Topic Input if mode is custom */}
      {mode === 'custom' && (
        <Card className="flex flex-col gap-2 p-4">
          <label htmlFor="custom-topic" className="text-xs font-semibold uppercase tracking-wider text-muted">
            Custom Topic or Scenario
          </label>
          <input
            id="custom-topic"
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="e.g., Pitching an eco-friendly tech startup to angel investors"
            className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Card>
      )}

      {/* Difficulty & Language */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Difficulty */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-ink">2. Difficulty Level</label>
          <div className="flex flex-col gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                type="button"
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={`flex items-start justify-between rounded-xl border p-3.5 text-left transition ${
                  difficulty === d.id
                    ? 'border-primary bg-soft/40 ring-1 ring-primary'
                    : 'border-line bg-surface hover:border-primary/30'
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-ink">{d.label}</p>
                  <p className="text-xs text-muted">{d.desc}</p>
                </div>
                {difficulty === d.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="flex flex-col gap-5">
          {/* Language */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Globe className="h-4 w-4 text-primary" />
              Language Preference
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  type="button"
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`rounded-xl border py-2.5 text-center text-sm font-medium transition ${
                    language === lang
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-line bg-surface text-ink hover:border-primary/40'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Clock className="h-4 w-4 text-primary" />
              Target Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((dur) => (
                <button
                  type="button"
                  key={dur}
                  onClick={() => setDuration(dur)}
                  className={`rounded-xl border py-2 text-center text-sm font-medium transition ${
                    duration === dur
                      ? 'border-primary bg-soft text-primary ring-1 ring-primary'
                      : 'border-line bg-surface text-ink hover:border-primary/40'
                  }`}
                >
                  {dur} min
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Permissions and Hardware Check */}
      <Card className="flex flex-col gap-4 p-5">
        <h3 className="text-sm font-semibold text-ink">3. Audio & Camera Permissions</h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Microphone Card */}
          <div className="flex items-start justify-between rounded-xl border border-line bg-canvas p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft text-primary">
                <Mic className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Microphone (Required)</p>
                <p className="mt-0.5 text-xs text-muted">Used for real-time speech interaction with the AI trainer.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={testMicrophone}
              disabled={micTesting || micChecked}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                micChecked
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'border border-line bg-white text-ink hover:border-primary'
              }`}
            >
              {micChecked ? 'Ready ✓' : micTesting ? 'Testing…' : 'Test Mic'}
            </button>
          </div>

          {/* Camera Card */}
          <div className="flex items-start justify-between rounded-xl border border-line bg-canvas p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft text-primary">
                <Camera className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Camera (Optional)</p>
                <p className="mt-0.5 text-xs text-muted">
                  Analyzes posture, gaze alignment, and gestures. No raw video is recorded or stored.
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={cameraEnabled}
                onChange={(e) => setCameraEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-line pt-6">
        <Button variant="ghost" onClick={onCancel}>
          Return to Dashboard
        </Button>
        <Button size="lg" onClick={handleStart} className="gap-2 px-8">
          <Sparkles className="h-4 w-4" />
          Start Live Session
        </Button>
      </div>
    </div>
  )
}
