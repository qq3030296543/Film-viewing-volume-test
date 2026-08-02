import { movies } from '../data/movies'
import type { AnswerRecord, Category, CategoryScore, Movie, QuizResult, QuizSession, TestMode } from '../types'

export const categories: Category[] = ['综合', '华语电影', '欧美电影', '日韩电影', '动画电影', '科幻', '悬疑', '恐怖', '喜剧', '文艺经典']

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

export const shuffledOptions = (items: string[]) => shuffle(items)

export const matchesCategory = (movie: Movie, category: Category) => {
  if (category === '综合') return true
  if (category === '华语电影') return movie.region === '华语'
  if (category === '欧美电影') return movie.region === '欧美'
  if (category === '日韩电影') return movie.region === '日韩'
  if (category === '动画电影') return movie.genres.includes('动画')
  return movie.genres.includes(category.replace('电影', ''))
}

export const createQuiz = (mode: TestMode, category: Category): Movie[] => {
  const preferred = shuffle(movies.filter((movie) => matchesCategory(movie, category)))
  const remaining = shuffle(movies.filter((movie) => !preferred.some((item) => item.id === movie.id)))
  return [...preferred, ...remaining].slice(0, mode)
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
    categoryScores,
    completedAt: Date.now(),
    dataSource: session.movies.some((movie) => movie.source === 'tmdb') ? 'tmdb' : 'local',
  }
}

export const primaryGenre = (movie: Movie) => displayGenres.find((genre) => movie.genres.includes(genre)) ?? movie.genres[0]

export const makeAnswer = (
  movie: Movie,
  recognized: boolean,
): AnswerRecord => ({
  movieId: movie.id,
  recognized,
  verified: recognized,
  skippedVerification: false,
  genre: primaryGenre(movie),
  points: recognized ? 1 : 0,
})
