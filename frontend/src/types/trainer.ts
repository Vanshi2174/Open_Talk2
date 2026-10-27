export type TrainerMode =
  | 'interview'
  | 'public_speaking'
  | 'conversation'
  | 'confidence'
  | 'custom'

export type TrainerDifficulty = 'beginner' | 'intermediate' | 'advanced'

export type TrainerLanguage = 'English' | 'Hindi' | 'Hinglish'

export interface TrainerStatusResponse {
  status: string
  gemini_configured: boolean
  supported_modes: TrainerMode[]
  supported_difficulties: TrainerDifficulty[]
  supported_languages: TrainerLanguage[]
}

export interface TrainerTurn {
  role: 'user' | 'model'
  text: string
  timestamp?: string
}

export interface SpeechMetrics {
  user_turn_count: number
  total_turn_count: number
  word_count: number
  sentence_count: number
  filler_count: number
  words_per_minute: number
  avg_words_per_turn: number
  avg_words_per_sentence: number
}

export interface VisualObservations {
  posture?: string
  orientation?: string
  gestures?: string
  facial_cues?: string
}

export interface ActionableImprovement {
  user_quote: string
  suggested_rewrite: string
  coaching_tip: string
}

export interface PerformanceIndicators {
  overall_score: number
  clarity_score: number
  fluency_score: number
  structure_score: number
  engagement_score: number
  scoring_criteria: string
}

export interface PracticePlan {
  recommended_focus: string
  exercises: string[]
  suggested_next_mode: string
}

export interface CommunicationFeedback {
  grammar_and_vocabulary?: string
  clarity_and_structure?: string
  relevance_and_completeness?: string
  fluency_and_pace?: string
  visual_observations?: string
}

export interface TrainerCoachingReport {
  summary: string
  strengths: string[]
  improvement_priorities: string[]
  communication_feedback: CommunicationFeedback
  actionable_improvements: ActionableImprovement[]
  performance_indicators: PerformanceIndicators
  practice_plan: PracticePlan
  metrics?: SpeechMetrics
}

export interface TrainerSession {
  id: string
  user_id: number
  mode: TrainerMode
  difficulty: TrainerDifficulty
  language: TrainerLanguage
  custom_topic: string | null
  target_duration_minutes: number
  duration_seconds: number
  camera_enabled: boolean
  transcript: string
  turns: TrainerTurn[]
  metrics: SpeechMetrics
  visual_observations: VisualObservations
  coaching_source: 'gemini' | 'local'
  coaching: TrainerCoachingReport
  started_at: string | null
  ended_at: string | null
  created_at: string | null
}

export interface TrainerSessionSummary {
  id: string
  session_type: 'trainer'
  mode: TrainerMode
  difficulty: TrainerDifficulty
  language: TrainerLanguage
  custom_topic: string | null
  duration_seconds: number
  camera_enabled: boolean
  coaching_source: 'gemini' | 'local'
  summary: string
  overall_score?: number
  created_at: string | null
  ended_at: string | null
}

export interface SaveTrainerSessionPayload {
  id: string
  mode: TrainerMode
  difficulty: TrainerDifficulty
  language: TrainerLanguage
  custom_topic?: string | null
  target_duration_minutes: number
  duration_seconds: number
  camera_enabled: boolean
  transcript: string
  turns: TrainerTurn[]
  visual_observations?: VisualObservations
  started_at?: string
  ended_at?: string
}
