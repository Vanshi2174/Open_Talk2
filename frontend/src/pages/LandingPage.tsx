import {
  ArrowRight,
  MessageCircle,
  Mic,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useAuth } from '../features/auth'

const features = [
  {
    title: 'Guided speaking practice',
    body: 'Work through interview, public speaking, everyday conversation, or your own prompt.',
    icon: Mic,
  },
  {
    title: 'Transcript-based coaching',
    body: 'Submit what you said and receive structured notes on grammar, clarity, and wording.',
    icon: Sparkles,
  },
  {
    title: 'Clearer everyday language',
    body: 'Practice answers you can reuse in meetings, interviews, and conversations.',
    icon: MessageCircle,
  },
  {
    title: 'Progress you can review',
    body: 'Keep a history of sessions so later practice builds on what you actually said.',
    icon: TrendingUp,
  },
]

export function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          <p className="mb-4 text-sm font-medium tracking-wide text-primary">
            AI communication coach
          </p>
          <h1 className="font-serif text-4xl leading-[1.15] tracking-tight text-ink sm:text-5xl lg:text-[3.35rem]">
            Practice speaking until your ideas come out clearly.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Open Talk helps you prepare for interviews, talks, and everyday
            conversation with structured practice and personalised feedback on
            your words — not invented scores.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to={isAuthenticated ? "/dashboard" : "/signup"} size="lg">
              {isAuthenticated ? "Go to dashboard" : "Start practicing"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            {!isAuthenticated ? (
              <Button to="/login" variant="outline" size="lg">
                I already have an account
              </Button>
            ) : null}
          </div>
          <p className="mt-5 text-sm text-muted">
            Sign in to practice out loud, save transcripts, and review coaching notes.
          </p>
        </div>

        <Card className="overflow-hidden p-5 sm:p-6" as="section" aria-label="Product preview">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Preview · speaking practice
          </p>
          <h2 className="mt-2 font-serif text-2xl text-ink">
            Tell me about a time you handled disagreement at work.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Interview prompt · transcript only. Acoustic measures such as pitch
            or pronunciation are not claimed here.
          </p>
          <div className="mt-6 rounded-2xl bg-soft p-4">
            <p className="text-sm leading-relaxed text-ink">
              “When a teammate and I disagreed on the launch date, I asked to
              walk through the risks together, then we agreed on a smaller first
              release…”
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-canvas px-3 py-1.5 text-xs text-muted">
              Grammar
            </span>
            <span className="rounded-full bg-canvas px-3 py-1.5 text-xs text-muted">
              Clarity
            </span>
            <span className="rounded-full bg-canvas px-3 py-1.5 text-xs text-muted">
              Stronger example
            </span>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white">
              <Mic className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">Ready when you are</p>
              <p className="text-sm text-muted">Start, pause, then submit your transcript.</p>
            </div>
          </div>
        </Card>
      </section>

      <section id="features" className="border-t border-line bg-surface">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <h2 className="font-serif text-3xl tracking-tight">What you will practice</h2>
          <p className="mt-3 max-w-2xl text-muted">
            Each session is built around a prompt, your spoken answer, and
            written coaching you can act on the next time you speak.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <article
                  key={feature.title}
                  className="rounded-[1.25rem] border border-line bg-canvas p-6"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-soft text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
