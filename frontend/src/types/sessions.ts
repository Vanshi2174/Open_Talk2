import type { Difficulty, PracticeMode } from '../features/practice/types'

export type CoachingMetrics = {
  word_count: number
  sentence_count: number
  filler_count: number
  avg_words_per_sentence: number
}

export type CoachingReport = {
  summary: string
  strengths: string[]
  improvements: string[]
  grammar_notes: string[]
  clarity_notes: string[]
  rewritten_example: string
  metrics: CoachingMetrics
}

export type SavedPracticeSession = {
  id: string
  mode: PracticeMode
  difficulty: Difficulty
  prompt: {
    id: string
    title: string
    text: string
  }
  transcript: string
  started_at: string | null
  stopped_at: string | null
  submitted_at: string | null
  created_at: string | null
  coaching_source: 'gemini' | 'local'
  coaching: CoachingReport
}

export type SessionSummary = {
  id: string
  mode: PracticeMode
  difficulty: Difficulty
  prompt_title: string
  submitted_at: string | null
  created_at: string | null
  coaching_source: 'gemini' | 'local'
  summary: string
  word_count: number | null
}

export type SessionStats = {
  total: number
  by_mode: Record<PracticeMode, number>
  last_practiced_at: string | null
}

export type SessionListResponse = {
  sessions: SessionSummary[]
  stats: SessionStats
}

export type PersistSessionPayload = {
  id: string
  mode: PracticeMode
  difficulty: Difficulty
  prompt: {
    id: string
    title: string
    text: string
  }
  transcript: string
  started_at: string | null
  stopped_at: string | null
  submitted_at: string
}

export type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; session: SavedPracticeSession }
  | { status: 'error'; message: string }
