import { useEffect, useMemo, useState } from 'react'
import { movies } from '../data/movies'
import { createTmdbHomePosterPool, readTmdbCredential, type HomePosterItem } from '../services/tmdb'
import type { QuizResult, TestMode } from '../types'
import { homePosterCandidates, shuffleItems } from '../utils/posters'
import { ResilientPosterImage } from './ResilientPosterImage'
import { levelLabel, useLanguage } from '../i18n'
import { LanguageSwitch } from './LanguageSwitch'

interface Props {
  mode: TestMode
  bestResult?: QuizResult
  historyCount: number
  hasActiveQuiz: boolean
  onChooseMode: (mode: TestMode) => void
  onStartSetup: () => void
  onResume: () => void
}

const POSTER_CACHE_KEY = 'cine-home-posters-v1'
const POSTER_CACHE_MAX_AGE = 12 * 60 * 60 * 1_000

interface PosterCache {
  savedAt: number
  items: HomePosterItem[]
}

const readPosterCache = (): PosterCache | null => {
  try {
    const value = localStorage.getItem(POSTER_CACHE_KEY)
    if (!value) return null
    const cache = JSON.parse(value) as PosterCache
    return Array.isArray(cache.items) && cache.items.length >= 18 ? cache : null
  } catch {
    return null
  }
}

const makeLocalPosterPool = (): HomePosterItem[] => shuffleItems(movies)
  .filter((movie) => movie.imageUrl)
  .slice(0, 24)
  .map((movie) => ({ id: movie.id, imageUrls: homePosterCandidates(movie) }))

const makeInitialPosterPool = () => {
  const cached = readPosterCache()
  return cached ? shuffleItems(cached.items).slice(0, 24) : makeLocalPosterPool()
}

export function HomeScreen({
  mode,
  bestResult,
  historyCount,
  hasActiveQuiz,
  onChooseMode,
  onStartSetup,
  onResume,
}: Props) {
  const { language } = useLanguage()
  const en = language === 'en'
  const modes: { value: TestMode; label: string; note: string }[] = [
    { value: 10, label: en ? 'Quick' : '快速', note: en ? '10 films' : '10 部电影' },
    { value: 20, label: en ? 'Standard' : '标准', note: en ? '20 films' : '20 部电影' },
    { value: 30, label: en ? 'Deep Dive' : '深度', note: en ? '30 films' : '30 部电影' },
  ]
  const [posterPool] = useState<HomePosterItem[]>(makeInitialPosterPool)

  useEffect(() => {
    const credential = readTmdbCredential()
    if (!credential) return undefined

    const cached = readPosterCache()
    if (cached && Date.now() - cached.savedAt < POSTER_CACHE_MAX_AGE) return undefined

    // 首屏不再二次换图；网络空闲后仅更新下次访问使用的实时海报缓存。
    const refreshTimer = window.setTimeout(() => {
      void createTmdbHomePosterPool(30, credential)
        .then((items) => {
          if (items.length >= 18) {
            localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items } satisfies PosterCache))
          }
        })
        .catch(() => {
          // 当前页面已经有随机本地海报，后台刷新失败无需打断用户。
        })
    }, 6_000)

    return () => window.clearTimeout(refreshTimer)
  }, [])

  const posterRows = useMemo(
    () => [0, 1, 2].map((row) => posterPool.filter((_, index) => index % 3 === row)),
    [posterPool],
  )
  const emergencyPool = useMemo(() => posterPool.flatMap((item) => item.imageUrls), [posterPool])

  return (
    <main className="cinematic-home" id="home">
      <div className="poster-flow" aria-hidden="true">
        {posterRows.map((row, rowIndex) => (
          <div className={`poster-flow-row poster-flow-row-${rowIndex + 1}`} key={rowIndex}>
            <div className="poster-flow-track">
              {[0, 1].map((copyIndex) => (
                <div className="poster-flow-set" key={copyIndex}>
                  {row.map((poster, posterIndex) => {
                    const emergencyOffset = (rowIndex * 8 + posterIndex + 1) % Math.max(emergencyPool.length, 1)
                    const emergencyCandidates = [
                      ...emergencyPool.slice(emergencyOffset),
                      ...emergencyPool.slice(0, emergencyOffset),
                    ].slice(0, 18)
                    return (
                      <figure className="poster-flow-card" key={`${poster.id}-${copyIndex}`}>
                        <ResilientPosterImage
                          sources={[...poster.imageUrls, ...emergencyCandidates]}
                          alt=""
                          loading="eager"
                          timeoutMs={2_200}
                          fetchPriority={rowIndex === 0 && posterIndex < 4 ? 'high' : 'low'}
                        />
                      </figure>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="home-mobile-language"><LanguageSwitch compact /></div>

      <nav className="cinematic-nav" aria-label={en ? 'Main navigation' : '主导航'}>
        <a className="cinematic-logo" href="#home" aria-label={en ? 'Cine Memory Bureau home' : '光影鉴赏局首页'}>
          {en ? 'Cine Memory Bureau' : '光影鉴赏局'}<sup>®</sup>
        </a>
        <div className="cinematic-nav-links">
          <a className="active" href="#home">{en ? 'Home' : '首页'}</a>
          <a href="#test-config">{en ? 'Test' : '阅历测试'}</a>
          {bestResult && <span>{en ? 'Latest' : '最近'} {bestResult.score} {en ? 'pts' : '分'} · {levelLabel(bestResult.playerLevel ?? '略知一二', language)}</span>}
        </div>
        <div className="cinematic-nav-actions">
          <LanguageSwitch compact />
          {hasActiveQuiz ? (
            <button className="liquid-glass nav-journey-button" onClick={onResume}>{en ? 'Resume' : '继续测试'}</button>
          ) : (
            <a className="liquid-glass nav-journey-button" href="#test-config">{en ? 'Choose Test' : '选择场次'}</a>
          )}
        </div>
      </nav>

      <section className="cinematic-hero" aria-labelledby="cinematic-title">
        <p className="cinematic-eyebrow animate-fade-rise">CINEMA MEMORY ASSESSMENT · 2026</p>
        <h1 id="cinematic-title" className="animate-fade-rise">
          {en
            ? <><span>One frame reveals</span><em>a lifetime<br />of cinema.</em></>
            : <><span>一帧光影，照见你的</span><em>阅片阅历。</em></>}
        </h1>
        <p className="cinematic-copy animate-fade-rise-delay">
          {en
            ? 'Begin with an image that hides its title. Recognize films from memory across genres, eras and regions, then discover your personal cinema rank.'
            : '从一张不透露片名的海报开始，凭记忆辨认电影，穿越类型、年代与地域，最终获得只属于你的阅片段位。'}
        </p>
        <button className="liquid-glass cinematic-cta animate-fade-rise-delay-2" onClick={onStartSetup}>
          <span>{hasActiveQuiz ? (en ? 'Start a New Test' : '重新开始测试') : (en ? 'Begin the Test' : '开始阅历测试')}</span>
          <span aria-hidden="true">→</span>
        </button>
        <p className="cinematic-motto animate-fade-rise-delay-2">{en ? 'Seeing is easy. Remembering is the test.' : '看过不算，记得才算。'}</p>
      </section>

      <section className="liquid-glass cinematic-config" id="test-config" aria-label={en ? 'Test settings' : '测试设置'}>
        <div className="config-heading"><span>TEST / 01</span><strong>{en ? 'Choose a Session' : '选择测试场次'}</strong></div>

        <div className="cinematic-modes" aria-label={en ? 'Test length' : '测试长度'}>
          {modes.map((item) => (
            <button
              key={item.value}
              className={mode === item.value ? 'selected' : ''}
              onClick={() => onChooseMode(item.value)}
              aria-pressed={mode === item.value}
            >
              <strong>{item.label}</strong><small>{item.note}</small>
            </button>
          ))}
        </div>

        <div className="config-flow-hint">
          <span>NEXT / 02</span>
          <strong>{en ? 'Identity & Genre' : '选择身份与类型'}</strong>
          <small>{en ? 'Difficulty changes films and distractors' : '难度将改变片单与干扰项'}</small>
        </div>

        <button className="config-start-button" onClick={onStartSetup}>{en ? 'Choose Identity' : '选择身份'} <span aria-hidden="true">→</span></button>
      </section>

      <footer className="cinematic-footer">
        <span>{en ? 'TMDB live database · No sign-in' : 'TMDB 实时片库 · 无需登录'}</span>
        <span>{historyCount ? (en ? `${historyCount} tests completed` : `已完成 ${historyCount} 场测试`) : (en ? 'Your cinema archive awaits' : '你的银幕档案尚未开启')}</span>
      </footer>
    </main>
  )
}
