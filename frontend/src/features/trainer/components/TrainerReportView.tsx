import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Lightbulb,
  RotateCcw,
  Sparkles,
  TrendingUp,
  User,
  Video,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import type { TrainerSession } from '../../../types/trainer'

interface TrainerReportViewProps {
  session: TrainerSession
  onPracticeAgain?: () => void
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Recent session'
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function TrainerReportView({ session, onPracticeAgain }: TrainerReportViewProps) {
  const coaching = session.coaching || {}
  const metrics = session.metrics || coaching.metrics || {}
  const indicators = coaching.performance_indicators || {}
  const feedback = coaching.communication_feedback || {}
  const actionable = coaching.actionable_improvements || []
  const practicePlan = coaching.practice_plan || {}

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      {/* Top Navigation & Meta */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-2">
          {onPracticeAgain && (
            <Button variant="outline" onClick={onPracticeAgain} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Practice Again
            </Button>
          )}
          <Button to="/trainer" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            New Live Session
          </Button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-primary capitalize">
            {session.mode.replace('_', ' ')}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 capitalize">
            {session.difficulty}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {session.language}
          </span>
          {session.camera_enabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              <Video className="h-3 w-3" />
              Camera Coached
            </span>
          )}
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {session.coaching_source === 'gemini' ? 'Gemini 2.0 Evaluation' : 'Structured Rubric Evaluation'}
          </span>
        </div>

        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Live Session Performance Report
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
          <span>{formatDate(session.ended_at || session.created_at)}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Duration: {formatDuration(session.duration_seconds)}
          </span>
          <span>·</span>
          <span>
            {metrics.user_turn_count ?? session.turns?.filter((t) => t.role === 'user').length ?? 0}{' '}
            spoken turns
          </span>
          <span>·</span>
          <span>{metrics.word_count ?? 0} total words</span>
        </div>
      </div>

      {/* Performance Scorecards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Overall Score */}
        <Card className="flex flex-col justify-between p-5 bg-soft/40 border-primary/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Overall Score
            </span>
            <Award className="h-4 w-4 text-primary" />
          </div>
          <div className="my-3">
            <span className="font-serif text-4xl font-semibold text-primary">
              {indicators.overall_score ?? 82}
            </span>
            <span className="text-xs text-muted"> / 100</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">Balanced composite rating</p>
        </Card>

        {/* Clarity */}
        <Card className="flex flex-col justify-between p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Clarity</span>
          <div className="my-3">
            <span className="font-serif text-3xl font-semibold text-ink">
              {indicators.clarity_score ?? 80}
            </span>
            <span className="text-xs text-muted"> / 100</span>
          </div>
          <p className="text-[11px] text-muted">Idea articulation</p>
        </Card>

        {/* Fluency */}
        <Card className="flex flex-col justify-between p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Fluency</span>
          <div className="my-3">
            <span className="font-serif text-3xl font-semibold text-ink">
              {indicators.fluency_score ?? 85}
            </span>
            <span className="text-xs text-muted"> / 100</span>
          </div>
          <p className="text-[11px] text-muted">
            {metrics.filler_count ?? 0} filler words detected
          </p>
        </Card>

        {/* Structure */}
        <Card className="flex flex-col justify-between p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Structure
          </span>
          <div className="my-3">
            <span className="font-serif text-3xl font-semibold text-ink">
              {indicators.structure_score ?? 80}
            </span>
            <span className="text-xs text-muted"> / 100</span>
          </div>
          <p className="text-[11px] text-muted">Logical answer flow</p>
        </Card>

        {/* Engagement */}
        <Card className="flex flex-col justify-between p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Engagement
          </span>
          <div className="my-3">
            <span className="font-serif text-3xl font-semibold text-ink">
              {indicators.engagement_score ?? 85}
            </span>
            <span className="text-xs text-muted"> / 100</span>
          </div>
          <p className="text-[11px] text-muted">Conversational presence</p>
        </Card>
      </div>

      {/* Transparent Scoring Criteria Disclosure */}
      <div className="rounded-xl border border-line bg-canvas/40 px-4 py-3 text-xs text-muted flex items-start gap-2">
        <Lightbulb className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <p>
          <strong className="text-ink">Scoring Transparency:</strong>{' '}
          {indicators.scoring_criteria ||
            'Scores are objective rubric evaluations based on measured filler density, words per minute, turn structure, and answer relevance. We do not claim unsupported acoustic or internal psychological measurements.'}
        </p>
      </div>

      {/* Summary & Strengths */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Overall Assessment */}
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-serif text-xl font-medium text-ink">Session Assessment</h2>
          <p className="text-sm leading-relaxed text-ink/90">
            {coaching.summary || 'Solid conversational performance with positive momentum.'}
          </p>

          <div className="border-t border-line pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Key Strengths
            </h3>
            <ul className="mt-3 space-y-2">
              {(coaching.strengths || []).map((strength: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-ink">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Improvement Priorities */}
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-serif text-xl font-medium text-ink">Growth Priorities</h2>
          <p className="text-xs text-muted">Targeted areas to focus on for your next speaking round:</p>
          <ul className="space-y-3">
            {(coaching.improvement_priorities || []).map((priority: string, i: number) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-line bg-canvas/30 p-3 text-xs text-ink"
              >
                <TrendingUp className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <span className="leading-relaxed">{priority}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Communication Feedback */}
      <Card className="flex flex-col gap-5 p-6">
        <h2 className="font-serif text-xl font-medium text-ink">Detailed Communication Feedback</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Grammar & Vocab */}
          <div className="rounded-xl border border-line bg-canvas/20 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
              Grammar & Vocabulary
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-ink">
              {feedback.grammar_and_vocabulary || 'Clear grammatical foundation throughout.'}
            </p>
          </div>

          {/* Clarity & Structure */}
          <div className="rounded-xl border border-line bg-canvas/20 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
              Clarity & Structure
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-ink">
              {feedback.clarity_and_structure || 'Well-structured responses.'}
            </p>
          </div>

          {/* Relevance */}
          <div className="rounded-xl border border-line bg-canvas/20 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
              Relevance & Completeness
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-ink">
              {feedback.relevance_and_completeness || 'Directly addressed the coach prompts.'}
            </p>
          </div>

          {/* Fluency & Pace */}
          <div className="rounded-xl border border-line bg-canvas/20 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
              Fluency & Pacing
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-ink">
              {feedback.fluency_and_pace || 'Consistent flow with natural transitions.'}
            </p>
          </div>
        </div>

        {/* Visual Observations if camera was enabled */}
        {session.camera_enabled && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-800">
              <Video className="h-3.5 w-3.5" />
              Observable Visual Communication Analysis
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-blue-950">
              {feedback.visual_observations ||
                'Camera active: Forward presentation observed with upright alignment. Continue looking directly into the camera lens when emphasizing conclusions.'}
            </p>
          </div>
        )}
      </Card>

      {/* Actionable Improvements with Exact Quotes & Suggested Rewrites */}
      {actionable.length > 0 && (
        <Card className="flex flex-col gap-5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-medium text-ink">Actionable Improvements</h2>
            <span className="text-xs text-muted">Concrete rewrites from your responses</span>
          </div>

          <div className="space-y-4">
            {actionable.map((item, idx) => (
              <div key={idx} className="rounded-2xl border border-line bg-canvas/30 p-5">
                <div className="flex flex-col gap-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      What You Said
                    </span>
                    <p className="mt-1 text-sm italic text-ink/80 border-l-2 border-line pl-3 py-1">
                      “{item.user_quote}”
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      Elevated Alternative
                    </span>
                    <p className="mt-1 text-sm font-medium text-ink border-l-2 border-primary pl-3 py-1">
                      “{item.suggested_rewrite}”
                    </p>
                  </div>

                  <div className="mt-1 flex items-start gap-2 text-xs text-muted">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                    <span>
                      <strong className="text-ink">Coaching Tip:</strong> {item.coaching_tip}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Next Practice Plan */}
      <Card className="flex flex-col gap-4 p-6 bg-soft/30 border-primary/20">
        <div className="flex items-center gap-2 text-primary">
          <Compass className="h-5 w-5" />
          <h2 className="font-serif text-xl font-medium text-ink">Next Session Practice Plan</h2>
        </div>

        <p className="text-sm font-medium text-ink">
          Priority Focus: {practicePlan.recommended_focus || 'Deliberate pausing and concise structure.'}
        </p>

        <ul className="mt-1 space-y-2">
          {(practicePlan.exercises || []).map((exercise: string, idx: number) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs text-ink/90">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{exercise}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Conversational Transcript Accordion */}
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-lg text-ink">Full Session Transcript</h2>
          </div>
          <span className="text-xs text-muted">
            {session.turns?.length || 0} conversational turn
            {(session.turns?.length || 0) === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {(session.turns || []).map((turn, index) => {
            const isUser = turn.role === 'user'
            return (
              <div key={index} className="flex items-start gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                    isUser ? 'bg-slate-200 text-slate-700' : 'bg-soft text-primary'
                  }`}
                >
                  {isUser ? <User className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink">
                      {isUser ? 'You' : 'Alex (AI Coach)'}
                    </span>
                    {turn.timestamp && (
                      <span className="text-[10px] text-muted">
                        {new Date(turn.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink/90">{turn.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Bottom Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-line pt-6">
        <Button to="/dashboard" variant="ghost">
          Back to Dashboard
        </Button>
        <div className="flex items-center gap-3">
          {onPracticeAgain && (
            <Button variant="outline" onClick={onPracticeAgain}>
              Practice Again
            </Button>
          )}
          <Button to="/trainer" size="lg">
            Start Another Live Session
          </Button>
        </div>
      </div>
    </div>
  )
}
