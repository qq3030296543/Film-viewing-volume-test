import { movies } from '../data/movies'
import type { AnswerRecord, Category, CategoryScore, Language, Movie, PlayerLevel, QuizResult, QuizSession, TestMode } from '../types'

export const categories: Category[] = ['综合', '华语电影', '欧美电影', '日韩电影', '动画电影', '科幻', '悬疑', '恐怖', '喜剧', '文艺经典']

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

export const shuffledOptions = <T,>(items: T[]) => shuffle(items)

export const matchesCategory = (movie: Movie, category: Category) => {
  if (category === '综合') return true
  if (category === '华语电影') return movie.region === '华语'
  if (category === '欧美电影') return movie.region === '欧美'
  if (category === '日韩电影') return movie.region === '日韩'
  if (category === '动画电影') return movie.genres.includes('动画')
  return movie.genres.includes(category.replace('电影', ''))
}

const difficultyOrder: Record<PlayerLevel, Movie['difficulty'][]> = {
  入门菜鸟: ['入门', '进阶', '资深'],
  略知一二: ['进阶', '资深', '入门'],
  阅片无数: ['资深', '进阶', '入门'],
}

const localDistractorScore = (target: Movie, candidate: Movie, level: PlayerLevel) => {
  const sharedGenres = target.genres.filter((genre) => candidate.genres.includes(genre)).length
  const yearDistance = Math.abs(target.year - candidate.year)
  const sameRegion = target.region === candidate.region ? 1 : 0
  const difficultyMatch = target.difficulty === candidate.difficulty ? 1 : 0
  const weights = level === '阅片无数'
    ? { genre: 125, region: 105, difficulty: 42, year: 3.1 }
    : level === '略知一二'
      ? { genre: 98, region: 82, difficulty: 34, year: 2.4 }
      : { genre: 72, region: 55, difficulty: 20, year: 1.5 }
  return sharedGenres * weights.genre
    + sameRegion * weights.region
    + difficultyMatch * weights.difficulty
    - Math.min(yearDistance, 40) * weights.year
}

const withLocalDistractors = (selected: Movie[], level: PlayerLevel, language: Language) => selected.map((movie) => {
  const candidates = shuffle(movies.filter((candidate) => candidate.id !== movie.id && candidate.title !== movie.title))
    .sort((left, right) => localDistractorScore(movie, right, level) - localDistractorScore(movie, left, level))
    .slice(0, 3)
  const localizedDistractors = {
    zh: candidates.map((candidate) => candidate.title),
    en: candidates.map((candidate) => candidate.originalTitle),
  }
  const englishSynopsis = 'This title comes from the built-in offline collection. Open its TMDB page after answering for full details.'
  return {
    ...movie,
    title: language === 'en' ? movie.originalTitle : movie.title,
    recognitionDistractors: localizedDistractors[language],
    localizedTitles: { zh: movie.title, en: movie.originalTitle },
    localizedDistractors,
    localizedSynopses: { zh: movie.synopsis, en: englishSynopsis },
    synopsis: language === 'en' ? englishSynopsis : movie.synopsis,
  }
})

export const createQuiz = (mode: TestMode, category: Category, playerLevel: PlayerLevel, language: Language = 'zh'): Movie[] => {
  const categoryMovies = movies.filter((movie) => matchesCategory(movie, category))
  const ordered = difficultyOrder[playerLevel].flatMap((difficulty) =>
    shuffle(categoryMovies.filter((movie) => movie.difficulty === difficulty)),
  )
  const categoryIds = new Set(ordered.map((movie) => movie.id))
  const fallback = difficultyOrder[playerLevel].flatMap((difficulty) =>
    shuffle(movies.filter((movie) => !categoryIds.has(movie.id) && movie.difficulty === difficulty)),
  )
  return withLocalDistractors([...ordered, ...fallback].slice(0, mode), playerLevel, language)
}

const displayGenres = ['剧情', '科幻', '悬疑', '动画', '喜剧', '恐怖']

export const calculateResult = (session: QuizSession): QuizResult => {
  const basePoints = session.answers.reduce((sum, answer) => sum + answer.points, 0)
  const score = Math.round((basePoints / session.mode) * 100)
  const recognizedCount = session.answers.filter((answer) => answer.recognized).length

  const categoryScores: CategoryScore[] = displayGenres.map((label) => {
    const relevant = session.movies.filter((movie) => movie.genres.includes(label))
    const relevantIds = new Set(relevant.map((movie) => movie.id))
    const records = session.answers.filter((answer) => relevantIds.has(answer.movieId))
    const earned = records.reduce((sum, answer) => sum + answer.points, 0)
    return {
      label,
      score: relevant.length ? Math.round((earned / relevant.length) * 100) : 0,
      correct: records.filter((answer) => answer.recognized).length,
      total: relevant.length,
    }
  })

  return {
    score,
    recognizedCount,
    verifiedCount: recognizedCount,
    fuzzyCount: session.mode - recognizedCount,
    bestStreak: session.bestStreak,
    accuracy: Math.round((recognizedCount / session.mode) * 100),
    category: session.category,
    mode: session.mode,
    playerLevel: session.playerLevel ?? '略知一二',
    categoryScores,
    completedAt: Date.now(),
    dataSource: session.movies.some((movie) => movie.source === 'tmdb') ? 'tmdb' : 'local',
  }
}

export const primaryGenre = (movie: Movie) => displayGenres.find((genre) => movie.genres.includes(genre)) ?? movie.genres[0]

export const makeAnswer = (
  movie: Movie,
  recognized: boolean,
  selectedAnswer: string,
): AnswerRecord => ({
  movieId: movie.id,
  selectedAnswer,
  recognized,
  verified: recognized,
  skippedVerification: false,
  genre: primaryGenre(movie),
  points: recognized ? 1 : 0,
})
