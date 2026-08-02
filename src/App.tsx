import { useEffect, useMemo, useState } from 'react'
import { DatabaseLoading } from './components/DatabaseLoading'
import { HomeScreen } from './components/HomeScreen'
import { QuizScreen } from './components/QuizScreen'
import { ResultScreen } from './components/ResultScreen'
import { createTmdbQuiz, readTmdbCredential } from './services/tmdb'
import type { AnswerRecord, Category, QuizResult, QuizSession, TestMode } from './types'
import { calculateResult, createQuiz } from './utils/quiz'

const ACTIVE_KEY = 'cine-memory-active-v2'
const HISTORY_KEY = 'cine-memory-history-v1'

type Screen = 'home' | 'loading' | 'quiz' | 'result'

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch { return fallback }
}

const imageCandidates = (movie: QuizSession['movies'][number]) =>
  [...new Set([movie.imageUrl, ...(movie.imageUrls ?? [])].filter(Boolean))]

const canLoadImage = (url: string) => new Promise<boolean>((resolve) => {
  const image = new Image()
  const timer = window.setTimeout(() => { image.src = ''; resolve(false) }, 10000)
  image.onload = () => { window.clearTimeout(timer); resolve(image.naturalWidth > 80 && image.naturalHeight > 80) }
  image.onerror = () => { window.clearTimeout(timer); resolve(false) }
  image.src = url
})

async function keepMoviesWithWorkingImages(movies: QuizSession['movies'], required: number) {
  const checked = await Promise.all(movies.map(async (movie) => {
    for (const url of imageCandidates(movie)) {
      if (await canLoadImage(url)) return { ...movie, imageUrl: url }
    }
    return null
  }))
  const available = checked.filter((movie): movie is NonNullable<typeof movie> => Boolean(movie))
  if (available.length < required) throw new Error(`可用电影图片不足：需要 ${required} 张，实际 ${available.length} 张`)
  return available.slice(0, required)
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<TestMode>(10)
  const [category, setCategory] = useState<Category>('综合')
  const [session, setSession] = useState<QuizSession | null>(() => readStorage<QuizSession | null>(ACTIVE_KEY, null))
  const [history, setHistory] = useState<QuizResult[]>(() => readStorage<QuizResult[]>(HISTORY_KEY, []))
  const [result, setResult] = useState<QuizResult | null>(null)
  const credential = useMemo(() => readTmdbCredential(), [])
  const bestResult = useMemo(() => [...history].sort((a, b) => b.score - a.score)[0], [history])

  useEffect(() => {
    if (session) localStorage.setItem(ACTIVE_KEY, JSON.stringify(session))
  }, [session])

  const startQuiz = async (chosenMode = mode, chosenCategory = category, forceLocal = false) => {
    setMode(chosenMode)
    setCategory(chosenCategory)
    if (credential && !forceLocal) setScreen('loading')

    let quizMovies
    try {
      const candidates = credential && !forceLocal
        ? await createTmdbQuiz(chosenMode, chosenCategory, credential)
        : createQuiz(chosenMode, chosenCategory)
      quizMovies = await keepMoviesWithWorkingImages(candidates, chosenMode)
    } catch {
      // 线上数据库短暂不可用时直接启用内置片库，用户无需处理 API。
      quizMovies = await keepMoviesWithWorkingImages(createQuiz(chosenMode, chosenCategory), chosenMode)
    }

    const next: QuizSession = {
      mode: chosenMode,
      category: chosenCategory,
      movies: quizMovies,
      currentIndex: 0,
      answers: [],
      currentStreak: 0,
      bestStreak: 0,
      startedAt: Date.now(),
    }
    setSession(next)
    setResult(null)
    setScreen('quiz')
  }

  const recordAnswer = (answer: AnswerRecord) => {
    if (!session) return
    const streak = answer.recognized ? session.currentStreak + 1 : 0
    const updated: QuizSession = {
      ...session,
      answers: [...session.answers, answer],
      currentIndex: session.currentIndex + 1,
      currentStreak: streak,
      bestStreak: Math.max(session.bestStreak, streak),
    }

    if (session.currentIndex + 1 >= session.mode) {
      const finalResult = calculateResult(updated)
      const nextHistory = [finalResult, ...history].slice(0, 12)
      setResult(finalResult)
      setHistory(nextHistory)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory))
      localStorage.removeItem(ACTIVE_KEY)
      setSession(null)
      setScreen('result')
    } else {
      setSession(updated)
    }
  }

  if (screen === 'quiz' && session) {
    const isLocalSession = session.movies[0]?.source !== 'tmdb'
    return <QuizScreen
      key={session.movies[session.currentIndex]?.id}
      session={session}
      onAnswer={recordAnswer}
      onExit={() => setScreen('home')}
      onRestart={() => void startQuiz(session.mode, session.category, isLocalSession)}
    />
  }

  if (screen === 'loading') return <DatabaseLoading mode={mode} category={category} />

  if (screen === 'result' && result) {
    return <ResultScreen
      result={result}
      onRetry={() => void startQuiz(result.mode, result.category, result.dataSource === 'local')}
      onChangeCategory={() => { setMode(result.mode); setScreen('home') }}
    />
  }

  return <HomeScreen
    mode={mode}
    category={category}
    bestResult={bestResult}
    historyCount={history.length}
    hasActiveQuiz={Boolean(session)}
    onModeChange={setMode}
    onCategoryChange={setCategory}
    onStart={() => void startQuiz()}
    onResume={() => setScreen('quiz')}
  />
}
