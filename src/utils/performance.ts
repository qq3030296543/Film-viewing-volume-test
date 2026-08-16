import type {
  AnswerRecord,
  LevelPerformanceSummary,
  Movie,
  MoviePerformanceStats,
  PerformanceSlice,
  PlayerLevel,
} from '../types'

const PERFORMANCE_KEY = 'cine-movie-performance-v1'
const playerLevels: PlayerLevel[] = ['入门菜鸟', '略知一二', '阅片无数']

type PerformanceStore = Record<string, MoviePerformanceStats>

const emptySlice = (): PerformanceSlice => ({ attempts: 0, correct: 0 })

const emptyByLevel = (): Record<PlayerLevel, PerformanceSlice> => ({
  入门菜鸟: emptySlice(),
  略知一二: emptySlice(),
  阅片无数: emptySlice(),
})

const normalizeStats = (movieId: string, value: Partial<MoviePerformanceStats>): MoviePerformanceStats => ({
  movieId,
  tmdbId: typeof value.tmdbId === 'number' ? value.tmdbId : undefined,
  title: typeof value.title === 'string' ? value.title : movieId,
  attempts: Number.isFinite(value.attempts) ? Math.max(0, Number(value.attempts)) : 0,
  correct: Number.isFinite(value.correct) ? Math.max(0, Number(value.correct)) : 0,
  byLevel: playerLevels.reduce((result, level) => {
    const slice = value.byLevel?.[level]
    result[level] = {
      attempts: Number.isFinite(slice?.attempts) ? Math.max(0, Number(slice?.attempts)) : 0,
      correct: Number.isFinite(slice?.correct) ? Math.max(0, Number(slice?.correct)) : 0,
    }
    return result
  }, emptyByLevel()),
  wrongAnswers: value.wrongAnswers && typeof value.wrongAnswers === 'object' ? value.wrongAnswers : {},
  lastAnsweredAt: Number.isFinite(value.lastAnsweredAt) ? Number(value.lastAnsweredAt) : 0,
})

export const readPerformanceStore = (): PerformanceStore => {
  try {
    const stored = localStorage.getItem(PERFORMANCE_KEY)
    if (!stored) return {}
    const parsed = JSON.parse(stored) as Record<string, Partial<MoviePerformanceStats>>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).map(([movieId, value]) => [movieId, normalizeStats(movieId, value)]))
  } catch {
    return {}
  }
}

export const recordMoviePerformance = (
  movie: Movie,
  answer: AnswerRecord,
  playerLevel: PlayerLevel,
) => {
  try {
    const store = readPerformanceStore()
    const current = store[movie.id] ?? normalizeStats(movie.id, {
      movieId: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
    })
    const levelSlice = current.byLevel[playerLevel] ?? emptySlice()
    const wrongAnswers = { ...current.wrongAnswers }
    if (!answer.recognized && answer.selectedAnswer) {
      wrongAnswers[answer.selectedAnswer] = (wrongAnswers[answer.selectedAnswer] ?? 0) + 1
    }

    store[movie.id] = {
      ...current,
      tmdbId: movie.tmdbId ?? current.tmdbId,
      title: movie.title,
      attempts: current.attempts + 1,
      correct: current.correct + (answer.recognized ? 1 : 0),
      byLevel: {
        ...current.byLevel,
        [playerLevel]: {
          attempts: levelSlice.attempts + 1,
          correct: levelSlice.correct + (answer.recognized ? 1 : 0),
        },
      },
      wrongAnswers,
      lastAnsweredAt: Date.now(),
    }
    localStorage.setItem(PERFORMANCE_KEY, JSON.stringify(store))
  } catch {
    // 禁止本地存储时不影响答题流程。
  }
}

export const getLevelPerformanceSummary = (playerLevel: PlayerLevel): LevelPerformanceSummary => {
  const slices = Object.values(readPerformanceStore())
    .map((stats) => stats.byLevel[playerLevel])
    .filter((slice) => slice.attempts > 0)
  const attempts = slices.reduce((sum, slice) => sum + slice.attempts, 0)
  const correct = slices.reduce((sum, slice) => sum + slice.correct, 0)
  return {
    attempts,
    correct,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
    movieCount: slices.length,
  }
}
