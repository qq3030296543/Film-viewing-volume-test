import { useEffect, useMemo, useState } from 'react'
import { HomeScreen } from './components/HomeScreen'
import { QuizScreen } from './components/QuizScreen'
import { ResultScreen } from './components/ResultScreen'
import { DatabaseLoading } from './components/DatabaseLoading'
import { DatabaseSetupModal } from './components/DatabaseSetupModal'
import type { AnswerRecord, Category, QuizResult, QuizSession, TestMode } from './types'
import { calculateResult, createQuiz } from './utils/quiz'
import { createTmdbQuiz, readTmdbCredential, testTmdbConnection } from './services/tmdb'

const ACTIVE_KEY = 'cine-memory-active-v1'
const HISTORY_KEY = 'cine-memory-history-v1'

type Screen = 'home' | 'loading' | 'quiz' | 'result'

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch { return fallback }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<TestMode>(10)
  const [category, setCategory] = useState<Category>('综合')
  const [session, setSession] = useState<QuizSession | null>(() => readStorage<QuizSession | null>(ACTIVE_KEY, null))
  const [history, setHistory] = useState<QuizResult[]>(() => readStorage<QuizResult[]>(HISTORY_KEY, []))
  const [result, setResult] = useState<QuizResult | null>(null)
  const [credential, setCredential] = useState(() => readTmdbCredential())
  const [databaseStatus, setDatabaseStatus] = useState<'offline' | 'checking' | 'connected' | 'error'>(credential ? 'checking' : 'offline')
  const [databaseError, setDatabaseError] = useState('')
  const [setupOpen, setSetupOpen] = useState(false)

  const bestResult = useMemo(() => [...history].sort((a, b) => b.score - a.score)[0], [history])

  useEffect(() => {
    if (session) localStorage.setItem(ACTIVE_KEY, JSON.stringify(session))
  }, [session])

  useEffect(() => {
    if (!credential) { setDatabaseStatus('offline'); return }
    let active = true
    setDatabaseStatus('checking')
    testTmdbConnection(credential)
      .then(() => { if (active) { setDatabaseStatus('connected'); setDatabaseError('') } })
      .catch((error) => { if (active) { setDatabaseStatus('error'); setDatabaseError(error instanceof Error ? error.message : 'TMDB 连接失败') } })
    return () => { active = false }
  }, [credential])

  const startQuiz = async (chosenMode = mode, chosenCategory = category, forceLocal = false) => {
    if (!credential && !forceLocal) { setSetupOpen(true); return }
    if (!forceLocal) setScreen('loading')
    let quizMovies
    try {
      quizMovies = forceLocal ? createQuiz(chosenMode, chosenCategory) : await createTmdbQuiz(chosenMode, chosenCategory, credential)
      if (!forceLocal) { setDatabaseStatus('connected'); setDatabaseError('') }
    } catch (error) {
      setDatabaseStatus('error')
      setDatabaseError(error instanceof Error ? error.message : '实时片单生成失败，请稍后重试。')
      setScreen('home')
      return
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
    const streak = answer.verified ? session.currentStreak + 1 : 0
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
    return <QuizScreen key={session.movies[session.currentIndex]?.id} session={session} onAnswer={recordAnswer} onExit={() => setScreen('home')} />
  }

  if (screen === 'loading') return <DatabaseLoading mode={mode} category={category} />

  if (screen === 'result' && result) {
    return <ResultScreen result={result} onRetry={() => void startQuiz(result.mode, result.category, result.dataSource === 'local')} onChangeCategory={() => { setMode(result.mode); setScreen('home') }} />
  }

  return <>
    <HomeScreen
      mode={mode}
      category={category}
      bestResult={bestResult}
      historyCount={history.length}
      hasActiveQuiz={Boolean(session)}
      databaseStatus={databaseStatus}
      databaseError={databaseError}
      onModeChange={setMode}
      onCategoryChange={setCategory}
      onStart={() => void startQuiz()}
      onResume={() => setScreen('quiz')}
      onDatabaseSettings={() => setSetupOpen(true)}
      onStartOffline={() => void startQuiz(mode, category, true)}
    />
    <DatabaseSetupModal
      open={setupOpen}
      initialCredential={credential}
      onClose={() => setSetupOpen(false)}
      onConfigured={(value) => { setCredential(value); setDatabaseStatus(value ? 'connected' : 'offline'); setDatabaseError('') }}
    />
  </>
}
