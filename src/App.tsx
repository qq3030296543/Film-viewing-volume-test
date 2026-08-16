import { useEffect, useMemo, useState } from 'react'
import { DatabaseLoading } from './components/DatabaseLoading'
import { DifficultyScreen } from './components/DifficultyScreen'
import { HomeScreen } from './components/HomeScreen'
import { QuizScreen } from './components/QuizScreen'
import { ResultScreen } from './components/ResultScreen'
import { createTmdbQuiz, hydrateTmdbMovieArtwork, readTmdbCredential } from './services/tmdb'
import type { AnswerRecord, Category, PlayerLevel, QuizResult, QuizSession, TestMode } from './types'
import { calculateResult, createQuiz } from './utils/quiz'
import { recordMoviePerformance } from './utils/performance'
import { useLanguage } from './i18n'

const ACTIVE_KEY = 'cine-memory-active-v2'
const HISTORY_KEY = 'cine-memory-history-v1'

type Screen = 'home' | 'difficulty' | 'loading' | 'quiz' | 'result'

const makeDevelopmentPreviewSession = (language: 'zh' | 'en'): QuizSession | null => {
  if (!import.meta.env.DEV || !new URLSearchParams(window.location.search).has('previewQuiz')) return null
  const previewMovies = createQuiz(10, '综合', '略知一二', language)
  return {
    mode: 10,
    category: '综合',
    playerLevel: '略知一二',
    movies: previewMovies,
    currentIndex: 0,
    answers: [],
    currentStreak: 0,
    bestStreak: 0,
    startedAt: Date.now(),
  }
}

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const { language } = useLanguage()
  const previewSession = useMemo(() => makeDevelopmentPreviewSession(language), [])
  const [screen, setScreen] = useState<Screen>(() => previewSession ? 'quiz' : 'home')
  const [mode, setMode] = useState<TestMode>(10)
  const [category, setCategory] = useState<Category>('综合')
  const [playerLevel, setPlayerLevel] = useState<PlayerLevel>('略知一二')
  const [session, setSession] = useState<QuizSession | null>(() => previewSession ?? readStorage<QuizSession | null>(ACTIVE_KEY, null))
  const [history, setHistory] = useState<QuizResult[]>(() => readStorage<QuizResult[]>(HISTORY_KEY, []))
  const [result, setResult] = useState<QuizResult | null>(null)
  const credential = useMemo(() => readTmdbCredential(), [])
  // 不跨身份比较原始分数；首页展示最近一次完整记录。
  const bestResult = history[0]

  useEffect(() => {
    if (session) localStorage.setItem(ACTIVE_KEY, JSON.stringify(session))
  }, [session])

  useEffect(() => {
    if (!credential || !session || screen !== 'quiz' || session.movies[0]?.source !== 'tmdb') return undefined

    let cancelled = false
    let cursor = 0
    const sourceSession = session
    const targets = sourceSession.movies.filter((movie) => !movie.textlessArtwork)

    const worker = async () => {
      while (!cancelled && cursor < targets.length) {
        const movie = targets[cursor]
        cursor += 1
        try {
          const hydrated = await hydrateTmdbMovieArtwork(movie, credential)
          if (cancelled || !hydrated.textlessArtwork) continue
          setSession((current) => {
            if (!current || current.startedAt !== sourceSession.startedAt) return current
            return { ...current, movies: current.movies.map((item) => item.id === hydrated.id ? hydrated : item) }
          })
        } catch {
          // 当前图片失败时，题面仍会使用发现接口返回的完整横版剧照。
        }
      }
    }

    void Promise.all([worker(), worker(), worker()])
    return () => { cancelled = true }
  }, [credential, screen, session?.startedAt])

  const startQuiz = async (
    chosenMode = mode,
    chosenCategory = category,
    chosenPlayerLevel = playerLevel,
    forceLocal = false,
  ) => {
    setMode(chosenMode)
    setCategory(chosenCategory)
    setPlayerLevel(chosenPlayerLevel)
    if (credential && !forceLocal) setScreen('loading')

    let quizMovies: QuizSession['movies']
    try {
      quizMovies = credential && !forceLocal
        ? await createTmdbQuiz(chosenMode, chosenCategory, chosenPlayerLevel, credential, language)
        : createQuiz(chosenMode, chosenCategory, chosenPlayerLevel, language)
    } catch {
      // 在线片库超时或暂时不可用时立即启用内置题库，不再逐张等待图片检测。
      quizMovies = createQuiz(chosenMode, chosenCategory, chosenPlayerLevel, language)
    }

    const next: QuizSession = {
      mode: chosenMode,
      category: chosenCategory,
      playerLevel: chosenPlayerLevel,
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
    const answeredMovie = session.movies[session.currentIndex]
    if (answeredMovie) recordMoviePerformance(answeredMovie, answer, session.playerLevel ?? '略知一二')
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
    return (
      <QuizScreen
        key={session.movies[session.currentIndex]?.id}
        session={session}
        onAnswer={recordAnswer}
        onExit={() => setScreen('home')}
        onRestart={() => void startQuiz(session.mode, session.category, session.playerLevel ?? '略知一二', isLocalSession)}
      />
    )
  }

  if (screen === 'difficulty') {
    return (
      <DifficultyScreen
        mode={mode}
        category={category}
        playerLevel={playerLevel}
        onCategoryChange={setCategory}
        onSelectPlayerLevel={(chosenPlayerLevel) => {
          setPlayerLevel(chosenPlayerLevel)
          void startQuiz(mode, category, chosenPlayerLevel)
        }}
        onBack={() => setScreen('home')}
      />
    )
  }

  if (screen === 'loading') return <DatabaseLoading mode={mode} category={category} playerLevel={playerLevel} />

  if (screen === 'result' && result) {
    return (
      <ResultScreen
        result={result}
        onRetry={() => void startQuiz(result.mode, result.category, result.playerLevel ?? '略知一二', result.dataSource === 'local')}
        onChangeCategory={() => {
          setMode(result.mode)
          setCategory(result.category)
          setPlayerLevel(result.playerLevel ?? '略知一二')
          setScreen('difficulty')
        }}
      />
    )
  }

  return (
    <HomeScreen
      mode={mode}
      bestResult={bestResult}
      historyCount={history.length}
      hasActiveQuiz={Boolean(session)}
      onChooseMode={(chosenMode) => { setMode(chosenMode); setScreen('difficulty') }}
      onStartSetup={() => setScreen('difficulty')}
      onResume={() => setScreen('quiz')}
    />
  )
}
