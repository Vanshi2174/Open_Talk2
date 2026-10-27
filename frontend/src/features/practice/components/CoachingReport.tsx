import { Card } from '../../../components/Card'
import type { CoachingReport as CoachingReportData, SavedPracticeSession } from '../../../types/sessions'

function NoteList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export function CoachingReportView({
  report,
  source,
}: {
  report: CoachingReportData
  source: SavedPracticeSession['coaching_source']
}) {
  const metrics = report.metrics
  return (
    <div className="flex flex-col gap-5">
      <Card className="p-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          {source === 'gemini' ? 'Gemini coaching' : 'Local transcript review'}
        </p>
        <h2 className="mt-2 font-serif text-2xl text-ink">Feedback</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink">{report.summary}</p>
        {source === 'local' ? (
          <p className="mt-3 text-sm text-muted">
            No Gemini API key is configured, so this review is based on the transcript text
            only — not invented acoustic scores.
          </p>
        ) : null}
        {metrics ? (
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-2xl bg-soft px-3 py-3">
              <dt className="text-muted">Words</dt>
              <dd className="mt-1 font-medium text-ink">{metrics.word_count}</dd>
            </div>
            <div className="rounded-2xl bg-soft px-3 py-3">
              <dt className="text-muted">Sentences</dt>
              <dd className="mt-1 font-medium text-ink">{metrics.sentence_count}</dd>
            </div>
            <div className="rounded-2xl bg-soft px-3 py-3">
              <dt className="text-muted">Fillers</dt>
              <dd className="mt-1 font-medium text-ink">{metrics.filler_count}</dd>
            </div>
            <div className="rounded-2xl bg-soft px-3 py-3">
              <dt className="text-muted">Avg. length</dt>
              <dd className="mt-1 font-medium text-ink">{metrics.avg_words_per_sentence}</dd>
            </div>
          </dl>
        ) : null}
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-6">
          <NoteList title="What worked" items={report.strengths} />
        </Card>
        <Card className="p-6">
          <NoteList title="Try next time" items={report.improvements} />
        </Card>
        <Card className="p-6">
          <NoteList title="Grammar" items={report.grammar_notes} />
        </Card>
        <Card className="p-6">
          <NoteList title="Clarity" items={report.clarity_notes} />
        </Card>
      </div>

      {report.rewritten_example ? (
        <Card className="p-6">
          <h3 className="text-sm font-medium text-ink">A clearer version</h3>
          <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink">
            {report.rewritten_example}
          </p>
        </Card>
      ) : null}
    </div>
  )
}
