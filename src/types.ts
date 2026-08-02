export type TestMode = 10 | 20 | 30

export type Category =
  | '综合'
  | '华语电影'
  | '欧美电影'
  | '日韩电影'
  | '动画电影'
  | '科幻'
  | '悬疑'
  | '恐怖'
  | '喜剧'
  | '文艺经典'

export type Difficulty = '入门' | '进阶' | '资深'

export interface Movie {
  id: string
  title: string
  originalTitle: string
  year: number
  region: '华语' | '欧美' | '日韩'
  genres: string[]
  director: string
  imageUrl: string
  imageAlt: string
  accent: [string, string]
  recognitionDistractors: string[]
  synopsis: string
  question: string
  options: string[]
  answer: string
  explanation: string
  spoiler: boolean
  difficulty: Difficulty
  recommendation: string
  source?: 'local' | 'tmdb'
  tmdbId?: number
  tmdbUrl?: string
  rating?: number
  voteCount?: number
  runtime?: number
  lastSyncedAt?: number
}

export interface AnswerRecord {
  movieId: string
  recognized: boolean
  verified: boolean
  skippedVerification: boolean
  genre: string
  points: number
}

export interface QuizSession {
  mode: TestMode
  category: Category
  movies: Movie[]
  currentIndex: number
  answers: AnswerRecord[]
  currentStreak: number
  bestStreak: number
  startedAt: number
}

export interface CategoryScore {
  label: string
  score: number
  correct: number
  total: number
}

export interface QuizResult {
  score: number
  recognizedCount: number
  verifiedCount: number
  fuzzyCount: number
  bestStreak: number
  accuracy: number
  category: Category
  mode: TestMode
  categoryScores: CategoryScore[]
  completedAt: number
  dataSource?: 'local' | 'tmdb'
}

export interface Rank {
  min: number
  max: number
  name: string
  icon: string
  eyebrow: string
  description: string
  color: string
}
