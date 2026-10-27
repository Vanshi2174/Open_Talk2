import { Briefcase, MessageCircle, Mic } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { difficultyLabel, modeLabel } from '../prompts'
import { DIFFICULTIES, PRACTICE_MODES, type Difficulty, type PracticeMode } from '../types'

const MODE_COPY: Record<
  PracticeMode,
  { icon: typeof Mic; body: string }
> = {
  interview: {
    icon: Briefcase,
    body: 'Answer a workplace interview prompt. Speak as if a hiring manager is listening.',
  },
  public_speaking: {
    icon: Mic,
    body: 'Practice a short talk. Aim for a clear opening and one idea the room can remember.',
  },
  conversation: {
    icon: MessageCircle,
    body: 'Rehearse an everyday exchange. Keep it natural, brief, and easy to answer.',
  },
}

const DIFFICULTY_COPY: Record<Difficulty, string> = {
  warm_up: 'Shorter prompt, lower stakes.',
  standard: 'A realistic situation you might actually face.',
  stretch: 'A harder room, a miss, or a tense follow-up.',
}

type SessionSetupProps = {
  mode: PracticeMode
  difficulty: Difficulty
  speechSupported: boolean
  onModeChange: (mode: PracticeMode) => void
  onDifficultyChange: (difficulty: Difficulty) => void
  onBegin: () => void
}

export function SessionSetup({
  mode,
  difficulty,
  speechSupported,
  onModeChange,
  onDifficultyChange,
  onBegin,
}: SessionSetupProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-12 sm:px-8">
      <div>
        <p className="text-sm font-medium tracking-wide text-primary">Practice Studio</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">Set up a session</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Choose a mode and difficulty, then speak to a prompt. Open Talk captures a transcript
          in your browser. Coaching reports are not part of this phase.
        </p>
      </div>

      <section aria-labelledby="practice-mode-heading">
        <h2 id="practice-mode-heading" className="text-sm font-medium text-ink">
          Practice mode
        </h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {PRACTICE_MODES.map((value) => {
            const Icon = MODE_COPY[value].icon
            const selected = value === mode
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => onModeChange(value)}
                className={[
                  'rounded-[1.25rem] border p-5 text-left transition-colors duration-150',
                  selected
                    ? 'border-primary bg-soft'
                    : 'border-line bg-surface hover:border-primary/60',
                ].join(' ')}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="mt-3 font-serif text-lg">{modeLabel(value)}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{MODE_COPY[value].body}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="difficulty-heading">
        <h2 id="difficulty-heading" className="text-sm font-medium text-ink">
          Difficulty
        </h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          {DIFFICULTIES.map((value) => {
            const selected = value === difficulty
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => onDifficultyChange(value)}
                className={[
                  'flex-1 rounded-2xl border px-4 py-3 text-left transition-colors duration-150',
                  selected
                    ? 'border-primary bg-soft'
                    : 'border-line bg-surface hover:border-primary/60',
                ].join(' ')}
              >
                <p className="text-sm font-medium text-ink">{difficultyLabel(value)}</p>
                <p className="mt-1 text-sm text-muted">{DIFFICULTY_COPY[value]}</p>
              </button>
            )
          })}
        </div>
      </section>

      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-ink">
            {modeLabel(mode)} · {difficultyLabel(difficulty)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {speechSupported
              ? 'Audio stays in the browser for recognition. Open Talk does not save a recording.'
              : 'This browser cannot transcribe speech. You can still type your answer in the studio.'}
          </p>
        </div>
        <Button size="lg" onClick={onBegin}>
          Start practice
        </Button>
      </Card>
    </div>
  )
}
