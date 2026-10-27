import type { Difficulty, PracticeMode, PracticePrompt } from './types'

export const PRACTICE_PROMPTS: PracticePrompt[] = [
  {
    id: 'interview-warm-1',
    mode: 'interview',
    difficulty: 'warm_up',
    title: 'Introduce yourself',
    text: 'Walk me through your background in about one minute. What should an interviewer remember about you?',
    guidance: 'Keep a simple arc: who you are, what you do, and what you want next.',
  },
  {
    id: 'interview-std-1',
    mode: 'interview',
    difficulty: 'standard',
    title: 'A disagreement at work',
    text: 'Tell me about a time you handled disagreement with a teammate. What did you do, and what changed afterward?',
    guidance: 'Name the situation, your action, and a concrete result. Avoid blaming.',
  },
  {
    id: 'interview-std-2',
    mode: 'interview',
    difficulty: 'standard',
    title: 'A tight deadline',
    text: 'Describe a time you had to deliver under a tight deadline. How did you decide what to cut and what to keep?',
    guidance: 'Show judgment, not just effort. Mention trade-offs.',
  },
  {
    id: 'interview-stretch-1',
    mode: 'interview',
    difficulty: 'stretch',
    title: 'A miss you owned',
    text: 'Talk about a project that missed the mark. What was your part in it, and what did you change afterward?',
    guidance: 'Be specific about the miss. End on a change you can prove.',
  },
  {
    id: 'speaking-warm-1',
    mode: 'public_speaking',
    difficulty: 'warm_up',
    title: 'Why this topic matters',
    text: 'Give a one-minute opening for a talk on something you care about. Why should this room listen?',
    guidance: 'Open with a person, a problem, or a surprising fact — not an outline.',
  },
  {
    id: 'speaking-std-1',
    mode: 'public_speaking',
    difficulty: 'standard',
    title: 'Explain a change',
    text: 'Your team is changing a familiar process. Explain the change to a mixed audience in two minutes.',
    guidance: 'Say what stays the same, what changes, and what people should do this week.',
  },
  {
    id: 'speaking-stretch-1',
    mode: 'public_speaking',
    difficulty: 'stretch',
    title: 'Hold a skeptical room',
    text: 'You have two minutes to persuade people who think this idea is unnecessary. Make the case without talking down to them.',
    guidance: 'Acknowledge the objection first, then offer one proof and one next step.',
  },
  {
    id: 'conversation-warm-1',
    mode: 'conversation',
    difficulty: 'warm_up',
    title: 'Catching up',
    text: 'A colleague asks how your week is going. Answer in a way that is honest, brief, and leaves room for them to reply.',
    guidance: 'One update, one feeling, one question back.',
  },
  {
    id: 'conversation-std-1',
    mode: 'conversation',
    difficulty: 'standard',
    title: 'A small request',
    text: 'You need a teammate’s help this afternoon. Ask clearly, give context, and make it easy to say no.',
    guidance: 'State the ask, the why, the time needed, and an alternative.',
  },
  {
    id: 'conversation-stretch-1',
    mode: 'conversation',
    difficulty: 'stretch',
    title: 'A tense check-in',
    text: 'Someone seemed frustrated in the last meeting. Start that follow-up conversation without putting them on the defensive.',
    guidance: 'Describe what you noticed, ask how they saw it, and pause.',
  },
]

const MODE_LABELS: Record<PracticeMode, string> = {
  interview: 'Mock interview',
  public_speaking: 'Public speaking',
  conversation: 'Everyday conversation',
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  warm_up: 'Warm-up',
  standard: 'Standard',
  stretch: 'Stretch',
}

export function modeLabel(mode: PracticeMode): string {
  return MODE_LABELS[mode]
}

export function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_LABELS[difficulty]
}

export function promptsFor(mode: PracticeMode, difficulty: Difficulty): PracticePrompt[] {
  return PRACTICE_PROMPTS.filter((prompt) => prompt.mode === mode && prompt.difficulty === difficulty)
}

export function selectPrompt(
  mode: PracticeMode,
  difficulty: Difficulty,
  random = Math.random,
): PracticePrompt {
  const pool = promptsFor(mode, difficulty)
  if (pool.length === 0) {
    return PRACTICE_PROMPTS.find((prompt) => prompt.mode === mode) ?? PRACTICE_PROMPTS[0]
  }
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length))
  return pool[index]
}
