import type {
  AnswerRecord,
  LevelPerformanceSummary,
  Movie,
  MoviePerformanceStats,
  PerformanceSlice,
  PlayerLevel,
  QuizResult,
  ViewingProfile,
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
  year: Number.isFinite(value.year) ? Number(value.year) : undefined,
  region: value.region,
  genres: Array.isArray(value.genres) ? value.genres.filter((genre): genre is string => typeof genre === 'string') : [],
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
      year: movie.year,
      region: movie.region,
      genres: movie.genres,
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

const metricFromSlices = (label: string, slices: MoviePerformanceStats[]) => {
  const attempts = slices.reduce((sum, item) => sum + item.attempts, 0)
  const correct = slices.reduce((sum, item) => sum + item.correct, 0)
  return {
    label,
    attempts,
    correct,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
  }
}

const rankMetrics = (metrics: ReturnType<typeof metricFromSlices>[]) => [...metrics]
  .filter((metric) => metric.attempts > 0)
  .sort((left, right) => right.accuracy - left.accuracy || right.attempts - left.attempts)

const eraLabel = (year?: number) => {
  if (!year) return '未知年代'
  if (year < 1960) return '1960 年以前'
  if (year < 1980) return '1960—1979'
  if (year < 2000) return '1980—1999'
  if (year < 2015) return '2000—2014'
  return '2015 至今'
}

const groupMetrics = (
  stats: MoviePerformanceStats[],
  labelsFor: (item: MoviePerformanceStats) => string[],
) => {
  const groups = new Map<string, MoviePerformanceStats[]>()
  stats.forEach((item) => {
    labelsFor(item).forEach((label) => groups.set(label, [...(groups.get(label) ?? []), item]))
  })
  return [...groups.entries()].map(([label, slices]) => metricFromSlices(label, slices))
}

export const getViewingProfile = (history: QuizResult[]): ViewingProfile => {
  const stats = Object.values(readPerformanceStore()).filter((item) => item.attempts > 0)
  const attempts = stats.reduce((sum, item) => sum + item.attempts, 0)
  const correct = stats.reduce((sum, item) => sum + item.correct, 0)
  const regionMetrics = groupMetrics(stats, (item) => item.region ? [item.region] : [])
  const eraMetrics = groupMetrics(stats, (item) => [eraLabel(item.year)])
  const genreMetrics = groupMetrics(stats, (item) => item.genres ?? [])
  const strongestRegion = rankMetrics(regionMetrics)[0]
  const strongestEra = rankMetrics(eraMetrics)[0]
  const strongestGenre = rankMetrics(genreMetrics)[0]
  const weakestGenre = [...genreMetrics]
    .filter((metric) => metric.attempts > 0)
    .sort((left, right) => left.accuracy - right.accuracy || right.attempts - left.attempts)[0]
  const levelOrder: PlayerLevel[] = ['入门菜鸟', '略知一二', '阅片无数']
  const highestLevel = history.reduce<PlayerLevel | undefined>((highest, result) => {
    const level = result.playerLevel ?? '略知一二'
    if (!highest || levelOrder.indexOf(level) > levelOrder.indexOf(highest)) return level
    return highest
  }, undefined)

  return {
    attempts,
    correct,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
    recognizedMovieCount: stats.filter((item) => item.correct > 0).length,
    strongestRegion,
    strongestEra,
    strongestGenre,
    weakestGenre,
    highestLevel,
    regionMetrics: rankMetrics(regionMetrics),
    eraMetrics: rankMetrics(eraMetrics),
    genreMetrics: rankMetrics(genreMetrics),
    trend: history.slice(0, 12).reverse().map((result) => ({
      score: result.score,
      completedAt: result.completedAt,
      playerLevel: result.playerLevel ?? '略知一二',
    })),
  }
}
